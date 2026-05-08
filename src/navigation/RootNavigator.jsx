import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator } from "react-native-paper";
import { View } from "react-native";
import { useAuth } from "../auth/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import CaptacionesListScreen from "../screens/CaptacionesListScreen";
import CaptacionCreateWizard from "../screens/CaptacionCreateWizard";
import CasoDetalleScreen from "../screens/CasoDetalleScreen";
import TomarFotoScreen from "../screens/TomarFotoScreen";
import FotosCaptacionScreen from "../screens/FotosCaptacionScreen";

// ✅ IMPORTA TU SCREEN DEL PDF
import PDFCasoScreen from "../screens/PDFCasoScreen";

const Stack = createNativeStackNavigator();

function CenterLoader() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}

export default function RootNavigator() {
  const { booting, token } = useAuth();

  if (booting) return <CenterLoader />;

  if (!token) {
    return (
      <Stack.Navigator>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Captaciones"
        component={CaptacionesListScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="NuevaCaptacion"
        component={CaptacionCreateWizard}
        options={{ title: "Nueva Captación" }}
      />

      <Stack.Screen
        name="CasoDetalle"
        component={CasoDetalleScreen}
        options={{ title: "Detalle Caso" }}
      />

      <Stack.Screen
        name="FotosCaptacion"
        component={FotosCaptacionScreen}
        options={{ title: "Fotos Captación" }}
      />

      <Stack.Screen
        name="TomarFoto"
        component={TomarFotoScreen}
        options={{ title: "Tomar Foto" }}
      />

      {/* ✅ ESTA ES LA QUE TE FALTABA */}
      <Stack.Screen
        name="PDFCasoScreen"
        component={PDFCasoScreen}
        options={{ title: "PDF (con fotos)" }}
      />
    </Stack.Navigator>
  );
}