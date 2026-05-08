import AsyncStorage from "@react-native-async-storage/async-storage";
import { BASE_URL } from "../../../api/client";
import * as FileSystem from "expo-file-system/legacy";

export async function uploadWithFileSystemOrBase64({ casoId, parteCasa, photoUri }) {
  const token = await AsyncStorage.getItem("token");
  if (!token) throw new Error("No hay token");

  const url = `${BASE_URL}/casos/${casoId}/fotos`;

  // (1) tu subida que ya funciona
  const res = await FileSystem.uploadAsync(url, photoUri, {
    httpMethod: "POST",
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName: "file",
    parameters: { parteCasa },
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status < 200 || res.status >= 300) {
    throw new Error(`Upload fail (${res.status}): ${res.body}`);
  }
}