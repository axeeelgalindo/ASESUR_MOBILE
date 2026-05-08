// src/screens/TomarFotoScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, Menu, Text, TextInput } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";

import { BASE_URL } from "../../api/client";
import { enqueueUpload, processQueue } from "../mobile/uploads/uploadQueue";

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

// ✅ comprime + devuelve base64 para evitar 413
async function compressToBase64(photoUri) {
  const manipulated = await ImageManipulator.manipulateAsync(
    photoUri,
    [{ resize: { width: 1600 } }],
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  );

  if (!manipulated?.base64) throw new Error("No se pudo generar base64");
  return manipulated.base64;
}

// ✅ función de subida usada por cola también
export async function uploadPhotoBase64({ casoId, parteCasa, photoUri, titulo }) {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("No hay token");

  const base64 = await compressToBase64(photoUri);

  const res = await fetch(`${BASE_URL}/casos/${casoId}/fotos-base64`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      parteCasa,
      filename: `foto_${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      base64,
      titulo: titulo ? String(titulo).trim() : null,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Error subiendo foto (${res.status})`);
  return json;
}

export default function TomarFotoScreen({ route, navigation }) {
  const { casoId, parteCasa: parteCasaParam, titulo: tituloParam } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [parteCasa, setParteCasa] = useState(parteCasaParam || "FACHADA");
  const [cameraRef, setCameraRef] = useState(null);

  const [comentario, setComentario] = useState(tituloParam || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    navigation.setOptions({ title: `Fotos (${prettyParte(parteCasa)})` });
  }, [navigation, parteCasa]);

  const hasPermission = useMemo(() => permission?.granted === true, [permission]);

  const takePhoto = async () => {
    setError("");
    setBusy(true);
    try {
      if (!cameraRef) throw new Error("Cámara no lista");

      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("No se obtuvo uri de foto");

      try {
        await uploadPhotoBase64({
          casoId,
          parteCasa,
          photoUri: photo.uri,
          titulo: comentario,
        });
        await processQueue();
        navigation.goBack();
      } catch (e) {
        await enqueueUpload({
          casoId,
          parteCasa,
          photoUri: photo.uri,
          createdAt: Date.now(),
          titulo: comentario,
        });
        setError("Falló subida. Quedó en cola y se subirá automáticamente.");
      }
    } catch (e) {
      setError(e?.message || "No se pudo tomar/subir la foto");
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
        quality: 1, // da igual, igual comprimimos
      });

      if (result.canceled) return;

      const assets = result.assets || [];
      if (!assets.length) throw new Error("No se seleccionaron fotos");

      for (const a of assets) {
        if (!a?.uri) continue;

        try {
          await uploadPhotoBase64({
            casoId,
            parteCasa,
            photoUri: a.uri,
            titulo: comentario,
          });
        } catch (e) {
          await enqueueUpload({
            casoId,
            parteCasa,
            photoUri: a.uri,
            createdAt: Date.now(),
            titulo: comentario,
          });
          setError("Falló una subida. Quedó en cola y se subirá automáticamente.");
        }
      }

      await processQueue();
      navigation.goBack();
    } catch (e) {
      setError(e?.message || "No se pudo seleccionar/subir desde galería");
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return (
      <View style={{ flex: 1, padding: 12, justifyContent: "center" }}>
        <Text>Cargando permisos...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, padding: 12, justifyContent: "center" }}>
        <Card style={{ padding: 12 }}>
          <Text variant="titleMedium" style={{ marginBottom: 10 }}>
            Permiso de cámara
          </Text>
          <Text style={{ opacity: 0.8, marginBottom: 12 }}>
            Necesitamos permiso para tomar fotos.
          </Text>
          <Button mode="contained" onPress={requestPermission}>
            Dar permiso
          </Button>
        </Card>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView style={{ flex: 1 }} facing="back" ref={(r) => setCameraRef(r)} />

      <View style={{ padding: 12 }}>
        <Card style={{ padding: 12 }}>
          <Text style={{ marginBottom: 8, opacity: 0.8 }}>Caso: {casoId}</Text>

          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button mode="outlined" onPress={() => setMenuVisible(true)}>
                Parte: {prettyParte(parteCasa)}
              </Button>
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

          <TextInput
            mode="outlined"
            label="Comentario (opcional)"
            value={comentario}
            onChangeText={setComentario}
            style={{ marginTop: 12 }}
            placeholder='Ej: "Daño en escalera, escalón 5 y 6"'
            multiline
          />

          {!!error && <Text style={{ marginTop: 10, color: "#B00020" }}>{error}</Text>}

          <Button
            mode="contained"
            icon="camera"
            style={{ marginTop: 12 }}
            loading={busy}
            disabled={busy}
            onPress={takePhoto}
          >
            Tomar y subir foto
          </Button>

          <Button
            mode="outlined"
            icon="image"
            style={{ marginTop: 10 }}
            loading={busy}
            disabled={busy}
            onPress={pickFromGallery}
          >
            Elegir desde galería
          </Button>

          <Button mode="text" style={{ marginTop: 6 }} onPress={() => navigation.goBack()}>
            Volver
          </Button>
        </Card>
      </View>
    </View>
  );
}