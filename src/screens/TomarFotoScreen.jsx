import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { Button, Card, Menu, Text } from "react-native-paper";
import { CameraView, useCameraPermissions } from "expo-camera";
import { BASE_URL } from "../../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy"; // ✅ NO legacy

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
  return p.replaceAll("_", " ");
}

export async function uploadPhotoBase64({ casoId, parteCasa, photoUri }) {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("No hay token");

  const info = await FileSystem.getInfoAsync(photoUri);
  if (!info.exists) throw new Error("La foto no existe en el dispositivo");
  if (!info.size || info.size <= 0) throw new Error("La foto quedó en 0 bytes");

  const base64 = await FileSystem.readAsStringAsync(photoUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

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
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.message || `Error subiendo foto (${res.status})`);

  return json;
}

export default function TomarFotoScreen({ route, navigation }) {
  const { casoId, parteCasa: parteCasaParam } = route.params;

  const [permission, requestPermission] = useCameraPermissions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [parteCasa, setParteCasa] = useState(parteCasaParam || "FACHADA");
  const [cameraRef, setCameraRef] = useState(null);
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
        quality: 0.6,          // 👈 baja un poco por si acaso
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("No se obtuvo uri de foto");

      console.log("PHOTO URI:", photo.uri, "PARTE:", parteCasa, "CASO:", casoId);

      await uploadPhotoBase64({ casoId, parteCasa, photoUri: photo.uri });

      navigation.goBack();
    } catch (e) {
      setError(e?.message || "No se pudo tomar/subir la foto");
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

          <Button mode="text" style={{ marginTop: 6 }} onPress={() => navigation.goBack()}>
            Volver
          </Button>
        </Card>
      </View>
    </View>
  );
}