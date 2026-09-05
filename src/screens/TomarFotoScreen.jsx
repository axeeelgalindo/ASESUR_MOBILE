import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Modal, ScrollView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useSafeScreenInsets } from "../utils/safeArea";

import {
  enqueueUpload,
  processQueue,
  uploadPhotoBase64,
} from "../mobile/uploads/uploadQueue";

const PARTES = [
  "FACHADA",
  "LIVING_COMEDOR",
  "COCINA",
  "DORMITORIO_PRINCIPAL",
  "DORMITORIO_SECUNDARIO",
  "BANO",
  "PASILLO",
  "ESCALERA",
  "TECHUMBRE",
  "TECHO",
  "PATIO",
  "GARAGE",
  "LOGGIA",
  "OTRO",
];

function prettyParte(p) {
  return String(p || "OTRO").replaceAll("_", " ");
}

export default function TomarFotoScreen({ route, navigation }) {
  const { casoId, parteCasa: parteCasaParam } = route.params;
  const { top: topPadding, bottom: bottomPadding } = useSafeScreenInsets();

  const [permission, requestPermission] = useCameraPermissions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [parteCasa, setParteCasa] = useState(parteCasaParam || "FACHADA");
  const [cameraRef, setCameraRef] = useState(null);

  const [fotosTomadas, setFotosTomadas] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const hasPermission = useMemo(
    () => permission?.granted === true,
    [permission]
  );

  const takePhoto = async () => {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      if (!cameraRef) throw new Error("Cámara no lista");

      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("No se obtuvo imagen");

      try {
        await uploadPhotoBase64({
          casoId,
          parteCasa,
          photoUri: photo.uri,
          titulo: null,
        });
        processQueue().catch(() => {});
      } catch (e) {
        await enqueueUpload({
          casoId,
          parteCasa,
          photoUri: photo.uri,
          createdAt: Date.now(),
          titulo: null,
        });
      }

      setFotosTomadas((prev) => prev + 1);
    } catch (e) {
      setError(e?.message || "No se pudo tomar la foto");
    } finally {
      setBusy(false);
    }
  };

  const pickFromGallery = async () => {
    setError("");
    setBusy(true);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) throw new Error("Permiso de galería denegado");

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 1,
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      if (!assets.length) throw new Error("No se seleccionaron fotos");

      let count = 0;
      for (const a of assets) {
        if (!a?.uri) continue;

        try {
          await uploadPhotoBase64({
            casoId,
            parteCasa,
            photoUri: a.uri,
            titulo: null,
          });
        } catch (e) {
          await enqueueUpload({
            casoId,
            parteCasa,
            photoUri: a.uri,
            createdAt: Date.now(),
            titulo: null,
          });
        }
        count++;
      }

      setFotosTomadas((prev) => prev + count);
      processQueue().catch(() => {});
    } catch (e) {
      setError(e?.message || "No se pudo seleccionar desde galería");
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white font-medium mt-4">Iniciando cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        className="flex-1 items-center justify-center bg-slate-950 px-6"
        style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}
      >
        <View className="bg-white rounded-3xl p-6 w-full items-center shadow-xl">
          <View className="w-16 h-16 rounded-full bg-blue-50 items-center justify-center mb-3">
            <MaterialIcons name="camera-alt" size={32} color="#2563eb" />
          </View>
          <Text className="text-lg font-black text-slate-900 text-center">
            Permiso de Cámara
          </Text>
          <Text className="text-xs text-slate-500 text-center mt-1.5 mb-6">
            Se requiere acceso para capturar la evidencia fotográfica de la
            inspección.
          </Text>
          <TouchableOpacity
            className="w-full bg-blue-600 h-12 rounded-2xl items-center justify-center shadow-md"
            activeOpacity={0.7}
            onPress={requestPermission}
          >
            <Text className="text-white font-extrabold text-sm">
              Permitir Acceso a la Cámara
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black relative">
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />
      <CameraView
        style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}
        facing="back"
        ref={(r) => setCameraRef(r)}
      />
      <View
        className="flex-1 justify-between p-4"
        style={{
          paddingTop: topPadding + 8,
          paddingBottom: Math.max(bottomPadding, 16),
        }}
      >
        {/* Top Overlaid Header */}
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            className="w-11 h-11 rounded-full bg-black/60 items-center justify-center border border-white/20"
          >
            <MaterialIcons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>

          {/* Part Selector Button */}
          <TouchableOpacity
            onPress={() => setMenuVisible(true)}
            activeOpacity={0.7}
            className="flex-row items-center gap-1 bg-black/60 px-4 py-2 rounded-full border border-white/30"
          >
            <MaterialIcons name="home-work" size={16} color="#ffffff" />
            <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
              {prettyParte(parteCasa)}
            </Text>
            <MaterialIcons
              name="arrow-drop-down"
              size={18}
              color="#ffffff"
            />
          </TouchableOpacity>

          {/* Counter */}
          <View className="bg-emerald-500/90 px-3 py-1.5 rounded-full flex-row items-center gap-1">
            <MaterialIcons name="check" size={14} color="#ffffff" />
            <Text className="text-white font-bold text-xs">
              {fotosTomadas} {fotosTomadas === 1 ? "foto" : "fotos"}
            </Text>
          </View>
        </View>

        {/* Error toast if any */}
        {!!error && (
          <View className="bg-rose-600/90 p-3 rounded-2xl mx-2 flex-row items-center gap-2">
            <MaterialIcons name="error-outline" size={18} color="#ffffff" />
            <Text className="text-white text-xs font-semibold flex-1">
              {error}
            </Text>
          </View>
        )}

        {/* Bottom Controls Bar */}
        <View className="bg-black/60 rounded-3xl p-4 border border-white/10 mb-2">
          {/* Done button if photos taken */}
          {fotosTomadas > 0 && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              className="w-full bg-emerald-600 h-11 rounded-2xl items-center justify-center flex-row gap-2 mb-4 shadow-md"
            >
              <MaterialIcons name="done-all" size={18} color="#ffffff" />
              <Text className="text-white font-extrabold text-xs uppercase tracking-wider">
                Listo • Cerrar Cámara ({fotosTomadas})
              </Text>
            </TouchableOpacity>
          )}

          <View className="flex-row items-center justify-around">
            {/* Gallery button */}
            <TouchableOpacity
              onPress={pickFromGallery}
              activeOpacity={0.7}
              disabled={busy}
              className="items-center justify-center w-13 h-13 rounded-full bg-white/15 border border-white/25"
            >
              <MaterialIcons name="photo-library" size={22} color="#ffffff" />
            </TouchableOpacity>

            {/* Main Shutter */}
            <TouchableOpacity
              onPress={takePhoto}
              activeOpacity={0.7}
              disabled={busy}
              className="w-20 h-20 rounded-full border-4 border-white/90 items-center justify-center bg-white/20 shadow-2xl"
            >
              {busy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <View className="w-16 h-16 rounded-full bg-white items-center justify-center shadow-lg">
                  <MaterialIcons
                    name="camera-alt"
                    size={28}
                    color="#2563eb"
                  />
                </View>
              )}
            </TouchableOpacity>

            {/* Back button */}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
              className="items-center justify-center w-13 h-13 rounded-full bg-white/15 border border-white/25"
            >
              <MaterialIcons name="arrow-back" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modal Selector de Zona / Parte */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 justify-center items-center bg-black/60 p-5"
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View className="bg-white rounded-3xl w-full max-w-[340px] max-h-[70%] overflow-hidden shadow-2xl">
            <View className="px-5 py-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50">
              <View className="flex-row items-center gap-2">
                <MaterialIcons name="home-work" size={20} color="#2563eb" />
                <Text className="font-extrabold text-slate-900 text-base">Seleccionar Zona</Text>
              </View>
              <TouchableOpacity
                onPress={() => setMenuVisible(false)}
                className="w-8 h-8 rounded-full bg-slate-200/60 items-center justify-center"
              >
                <MaterialIcons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView className="p-3">
              {PARTES.map((p) => {
                const isSelected = parteCasa === p;
                return (
                  <TouchableOpacity
                    key={p}
                    onPress={() => {
                      setParteCasa(p);
                      setMenuVisible(false);
                    }}
                    className={`py-3 px-3.5 rounded-xl flex-row items-center justify-between mb-1.5 ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-slate-50/70 border border-slate-100"
                    }`}
                  >
                    <Text className={`text-xs font-bold ${isSelected ? "text-blue-700" : "text-slate-700"}`}>
                      {prettyParte(p)}
                    </Text>
                    {isSelected && <MaterialIcons name="check" size={18} color="#2563eb" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}