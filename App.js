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
]);
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

// ✅ cola offline
import { processQueue } from "./src/mobile/uploads/uploadQueue";

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

  return <RootNavigator />;
}

export default function App() {
  useEffect(() => {
    if (Platform.OS === "android") {
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor("transparent");
      RNStatusBar.setBarStyle("dark-content");
    }

    // ✅ Intenta procesar cola de subida de forma diferida para no interferir con el arranque
    const timer = setTimeout(() => {
      processQueue().catch(() => {});
    }, 1500);

    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setTimeout(() => {
          processQueue().catch(() => {});
        }, 1000);
      }
    });

    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <NavigationContainer>
            <View style={{ flex: 1 }}>
              <StatusBar style="dark" backgroundColor="transparent" translucent={true} />
              <MainApp />
            </View>
          </NavigationContainer>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}