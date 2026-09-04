import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Menu } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from "expo-status-bar";
import { useSafeScreenInsets } from "../utils/safeArea";

import { enqueueUpload, processQueue, uploadPhotoBase64, compressToBase64 } from "../mobile/uploads/uploadQueue";

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

  const hasPermission = useMemo(() => permission?.granted === true, [permission]);

  // ✅ Toma continua: toma la foto, la procesa/sube, incrementa contador y se mantiene en la cámara
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

      if (!photo?.uri) throw new Error("No se obtuvo uri de foto");

      // Subir o encolar sin cerrar la cámara
      try {
        await uploadPhotoBase64({
          casoId,
          parteCasa,
          photoUri: photo.uri,
          titulo: null, // Los comentarios se manejan exclusivamente afuera
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
      <View className="flex-1 items-center justify-center bg-slate-900 px-6">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="text-white font-medium mt-4">Cargando permisos de cámara...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-900 px-6" style={{ paddingTop: topPadding, paddingBottom: bottomPadding }}>
        <View className="bg-white rounded-3xl p-6 w-full items-center shadow-lg">
          <MaterialIcons name="camera-alt" size={48} color="#1152d4" />
          <Text className="text-lg font-bold text-slate-900 mt-3 text-center">Permiso de Cámara Requerido</Text>
          <Text className="text-sm text-slate-500 text-center mt-2 mb-6">
            Necesitamos acceso a la cámara para capturar la evidencia del caso en terreno.
          </Text>
          <TouchableOpacity
            className="w-full bg-[#1152d4] h-12 rounded-xl items-center justify-center"
            onPress={requestPermission}
          >
            <Text className="text-white font-bold text-base">Permitir Cámara</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar style="light" backgroundColor="transparent" translucent={true} />
      <CameraView style={{ flex: 1 }} facing="back" ref={(r) => setCameraRef(r)}>
        <View className="flex-1 justify-between p-4" style={{ paddingTop: topPadding + 8, paddingBottom: Math.max(bottomPadding, 16) }}>
          
          {/* Header Superior sobre la Cámara */}
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-11 h-11 rounded-full bg-black/50 items-center justify-center border border-white/20"
              activeOpacity={0.7}
            >
              <MaterialIcons name="close" size={24} color="#ffffff" />
            </TouchableOpacity>

            {/* Selector de Parte de Casa */}
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  onPress={() => setMenuVisible(true)}
                  className="flex-row items-center gap-1.5 bg-black/60 px-4 py-2 rounded-full border border-white/30"
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="home-work" size={16} color="#ffffff" />
                  <Text className="text-white font-bold text-xs uppercase tracking-wider">
                    {prettyParte(parteCasa)}
                  </Text>
                  <MaterialIcons name="arrow-drop-down" size={20} color="#ffffff" />
                </TouchableOpacity>
              }
            >
              {PARTES.map((p) => (
                <Menu.Item
                  key={p}
                  title={prettyParte(p)}
                  onPress={() => {
                    setParteCasa(p);
                    setMenuVisible(false);
                  }}
                />
              ))}
            </Menu>

            {/* Contador en vivo */}
            <View className="bg-emerald-500/90 px-3 py-1.5 rounded-full flex-row items-center gap-1">
              <MaterialIcons name="check-circle" size={16} color="#ffffff" />
              <Text className="text-white font-bold text-xs">
                {fotosTomadas} {fotosTomadas === 1 ? "foto" : "fotos"}
              </Text>
            </View>
          </View>

          {/* Mensaje de error si ocurre */}
          {!!error && (
            <View className="bg-red-600/90 p-3 rounded-xl mx-2 flex-row items-center gap-2">
              <MaterialIcons name="error-outline" size={20} color="#ffffff" />
              <Text className="text-white text-xs font-semibold flex-1">{error}</Text>
            </View>
          )}

          {/* Barra de Controles Inferior */}
          <View className="bg-black/60 rounded-3xl p-4 border border-white/10 mb-2">
            
            {/* Botón "Cerrar / Listo" si ya tomó fotos */}
            {fotosTomadas > 0 && (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="w-full bg-emerald-600 h-11 rounded-xl items-center justify-center flex-row gap-2 mb-4 shadow-sm"
                activeOpacity={0.8}
              >
                <MaterialIcons name="done-all" size={20} color="#ffffff" />
                <Text className="text-white font-bold text-sm uppercase tracking-wider">
                  Listo • Cerrar Cámara ({fotosTomadas})
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-row items-center justify-around">
              {/* Botón Galería */}
              <TouchableOpacity
                onPress={pickFromGallery}
                disabled={busy}
                className="items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20"
                activeOpacity={0.7}
              >
                <MaterialIcons name="photo-library" size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* Botón Disparador Principal (Toma continua) */}
              <TouchableOpacity
                onPress={takePhoto}
                disabled={busy}
                className="w-20 h-20 rounded-full border-4 border-white items-center justify-center bg-white/20"
                activeOpacity={0.7}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View className="w-16 h-16 rounded-full bg-white items-center justify-center shadow-md">
                    <MaterialIcons name="camera-alt" size={30} color="#1152d4" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Botón Volver */}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                className="items-center justify-center w-14 h-14 rounded-full bg-white/10 border border-white/20"
                activeOpacity={0.7}
              >
                <MaterialIcons name="arrow-back" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </CameraView>
    </View>
  );
}