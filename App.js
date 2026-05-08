/// <reference types="nativewind/types" />
import "./global.css";
import React, { useEffect } from "react";
import { AppState, View } from "react-native";
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";

import { AuthProvider } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import GlobalKeyboardToolbar from "./src/components/GlobalKeyboardToolbar";

// ✅ cola offline
import { processQueue } from "./src/mobile/uploads/uploadQueue";

// ✅ background task (Expo)
import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

const UPLOAD_TASK = "UPLOAD_QUEUE_TASK";

// 1) Definir tarea background (se ejecuta cuando iOS/Android te deja)
TaskManager.defineTask(UPLOAD_TASK, async () => {
  try {
    await processQueue();
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (e) {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

// 2) Registrar tarea background
async function registerUploadTask() {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
      // iOS puede decir Restricted/Denied
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(UPLOAD_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(UPLOAD_TASK, {
      minimumInterval: 60 * 5, // 5 min (aprox)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    // no crashear app si background fetch falla
    console.log("BG register error:", e?.message || e);
  }
}

export default function App() {
  useEffect(() => {
    // ✅ 1) registra background upload
    registerUploadTask();

    // ✅ 2) intenta subir cola al abrir app
    processQueue();

    // ✅ 3) cada vez que la app vuelve a foreground, intenta subir cola
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        processQueue();
      }
    });

    return () => sub.remove();
  }, []);

  return (
    <PaperProvider>
      <AuthProvider>
        <View style={{ flex: 1 }}>
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
          <GlobalKeyboardToolbar />
        </View>
      </AuthProvider>
    </PaperProvider>
  );
}