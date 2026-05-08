// src/mobile/uploads/uploadQueue.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import { uploadPhotoBase64 } from "../../screens/TomarFotoScreen"; // ajusta si tu ruta real es distinta

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