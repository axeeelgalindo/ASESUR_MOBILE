import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import { BASE_URL } from "../../../api/client";

// ✅ Comprime + devuelve base64 para evitar 413
export async function compressToBase64(photoUri) {
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

// ✅ Función de subida usada por cola y subida directa
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

const KEY = "UPLOAD_QUEUE_V1";
let running = false;

async function readQueue() {
  const raw = await AsyncStorage.getItem(KEY);
  const q = raw ? JSON.parse(raw) : [];
  return Array.isArray(q) ? q : [];
}

async function writeQueue(q) {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

export async function enqueueUpload(job) {
  const q = await readQueue();
  q.push(job);
  await writeQueue(q);
}

export async function processQueue() {
  if (running) return;
  running = true;

  try {
    const q = await readQueue();
    if (q.length === 0) return;

    const remaining = [];

    for (const job of q) {
      try {
        await uploadPhotoBase64({
          casoId: job.casoId,
          parteCasa: job.parteCasa,
          photoUri: job.photoUri,
          titulo: job.titulo || null,
        });
      } catch (e) {
        // queda en cola para reintentar después
        remaining.push(job);
      }
    }

    await writeQueue(remaining);
  } finally {
    running = false;
  }
}