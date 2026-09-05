/// <reference types="nativewind/types" />
import "./global.css";
import React, { useEffect } from "react";
import { AppState, View, StatusBar as RNStatusBar, Platform, LogBox, ActivityIndicator } from "react-native";

// Ocultar barra/toast flotante de warnings (LogBox) en pantalla del dispositivo
LogBox.ignoreAllLogs(true);
LogBox.ignoreLogs([
  "Require cycle:",
  "setLayoutAnimationEnabledExperimental",
  "SafeAreaView has been deprecated",
  "expo-background-fetch",
]);
import { PaperProvider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";

import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

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
      return;
    }

    const isRegistered = await TaskManager.isTaskRegisteredAsync(UPLOAD_TASK);
    if (isRegistered) return;

    await BackgroundFetch.registerTaskAsync(UPLOAD_TASK, {
      minimumInterval: 60 * 5,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch {
    // Expo Go o iOS sin UIBackgroundModes habilitado
  }
}

function CenterLoader() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f8fafc" }}>
      <ActivityIndicator size="large" color="#2563eb" />
    </View>
  );
}

function MainApp() {
  const { booting } = useAuth();

  if (booting) {
    return <CenterLoader />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor("transparent");
      RNStatusBar.setBarStyle("dark-content");
    }

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
    <SafeAreaProvider>
      <PaperProvider>
        <AuthProvider>
          <View style={{ flex: 1 }}>
            <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
            <MainApp />
          </View>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}