import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImageManipulator from "expo-image-manipulator";
import { BASE_URL } from "../../../api/client";

// ✅ Comprime + devuelve base64 para evitar 413
export async function compressToBase64(photoUri) {
  if (!photoUri) throw new Error("URI de foto inválida");
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
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const q = raw ? JSON.parse(raw) : [];
    return Array.isArray(q) ? q : [];
  } catch {
    return [];
  }
}

async function writeQueue(q) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    // ignore
  }
}

export async function enqueueUpload(job) {
  try {
    const q = await readQueue();
    q.push({ ...job, retries: 0 });
    await writeQueue(q);
  } catch {
    // ignore
  }
}

export async function processQueue() {
  if (running) return;
  const token = await AsyncStorage.getItem("token");
  if (!token) return;
  running = true;

  try {
    const q = await readQueue();
    if (!q || q.length === 0) return;

    const remaining = [];

    for (const job of q) {
      // Descartar jobs con más de 3 reintentos fallidos o sin URI
      if (!job?.photoUri || (job.retries && job.retries >= 3)) {
        continue;
      }

      try {
        await uploadPhotoBase64({
          casoId: job.casoId,
          parteCasa: job.parteCasa,
          photoUri: job.photoUri,
          titulo: job.titulo || null,
        });
      } catch (e) {
        // Incrementa reintentos y mantiene en cola si no superó el límite
        const retries = (job.retries || 0) + 1;
        if (retries < 3) {
          remaining.push({ ...job, retries });
        }
      }
    }

    await writeQueue(remaining);
  } catch {
    // Proteger contra cualquier error fatal
  } finally {
    running = false;
  }
}