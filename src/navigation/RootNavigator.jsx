import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../auth/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import CaptacionesListScreen from "../screens/CaptacionesListScreen";
import CaptacionCreateWizard from "../screens/CaptacionCreateWizard";
import CasoDetalleScreen from "../screens/CasoDetalleScreen";
import TomarFotoScreen from "../screens/TomarFotoScreen";
import FotosCaptacionScreen from "../screens/FotosCaptacionScreen";
import PDFCasoScreen from "../screens/PDFCasoScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { token } = useAuth();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {!token ? (
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />
      ) : (
        <Stack.Group>
          <Stack.Screen
            name="Captaciones"
            component={CaptacionesListScreen}
          />
          <Stack.Screen
            name="NuevaCaptacion"
            component={CaptacionCreateWizard}
            options={{
              gestureEnabled: false,
            }}
          />
          <Stack.Screen
            name="CasoDetalle"
            component={CasoDetalleScreen}
          />
          <Stack.Screen
            name="FotosCaptacion"
            component={FotosCaptacionScreen}
          />
          <Stack.Screen
            name="TomarFoto"
            component={TomarFotoScreen}
            options={{
              animation: "fade",
            }}
          />
          <Stack.Screen
            name="PDFCasoScreen"
            component={PDFCasoScreen}
          />
        </Stack.Group>
      )}
    </Stack.Navigator>
  );
}