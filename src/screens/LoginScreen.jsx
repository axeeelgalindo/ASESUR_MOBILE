import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, View, Text, TextInput, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, useColorScheme } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("juan@juan.cl");
  const [password, setPassword] = useState("123");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [rutBusquilla, setRutBusquilla] = useState("");
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const onSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      console.log("LOGIN ERROR", e?.response?.data || e.message);
      setError(e?.response?.data?.message || e.message || "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  const onBuscarCaso = () => {
    if (!rutBusquilla.trim()) {
      Alert.alert("RUT Inválido", "Por favor ingresa un número de RUT.");
      return;
    }
    Alert.alert(
      "Consulta de Estado",
      `Buscando información para el RUT:\n${rutBusquilla}\n\n*La pantalla móvil completa de progreso estará disponible en la próxima actualización. Te invitamos a consultar desde tu navegador web por ahora.*`
    );
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
          {/* Decorative backgrounds */}
          <View className="absolute -top-24 -left-24 w-96 h-96 bg-[#1152d4]/5 rounded-full" />
          <View className="absolute -bottom-24 -right-24 w-96 h-96 bg-[#1152d4]/5 rounded-full" />

          {/* Login Card */}
          <View className="w-full max-w-[440px] bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm" style={{ elevation: 2 }}>

            {/* Top App Bar / Logo Section */}
            <View className="items-center pt-10 pb-6 px-6">
              <View className="w-16 h-16 bg-[#1152d4]/10 rounded-full flex items-center justify-center mb-6 overflow-hidden">
                <Image
                  source={require('../../assets/icon.png')}
                  style={{ width: 44, height: 44, borderRadius: 22 }}
                  resizeMode="cover"
                />
              </View>
              <Text className="text-slate-900 dark:text-white text-2xl font-bold tracking-tight text-center">
                Bienvenido
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-base mt-2 text-center">
                Inicia sesión para continuar
              </Text>
            </View>

            {/* Login Form */}
            <View className="px-8 pb-10">
              {/* Email Field */}
              <View className="mb-5">
                <View className="flex-row items-center gap-2 mb-2">
                  <MaterialIcons name="mail-outline" size={18} color="#1152d4" />
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold flex-1">Correo electrónico</Text>
                </View>
                <TextInput
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white h-12 px-4 focus:border-[#1152d4] dark:focus:border-blue-500"
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              {/* Password Field */}
              <View className="mb-5">
                <View className="flex-row items-center gap-2 mb-2">
                  <MaterialIcons name="lock-outline" size={18} color="#1152d4" />
                  <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold flex-1">Contraseña</Text>
                </View>
                <View className="relative justify-center">
                  <TextInput
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white h-12 pl-4 pr-12 focus:border-[#1152d4] dark:focus:border-blue-500"
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    className="absolute right-3 p-2"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility-off" : "visibility"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Message */}
              {!!error && (
                <Text className="text-red-500 text-sm text-center mb-3 font-semibold">{error}</Text>
              )}

              {/* Remember & Forgot */}
              <View className="flex-row items-center justify-between py-1 mb-6">
                <TouchableOpacity
                  className="flex-row items-center gap-2"
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View className={`w-4 h-4 rounded border justify-center items-center ${rememberMe ? 'bg-[#1152d4] border-[#1152d4]' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                    {rememberMe && <MaterialIcons name="check" size={12} color="#ffffff" />}
                  </View>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">Recordarme</Text>
                </TouchableOpacity>

              </View>

              {/* Login Button */}
              <TouchableOpacity
                className="w-full h-12 bg-[#2563eb] dark:bg-blue-600 rounded-lg items-center justify-center flex-row gap-2"
                style={{ elevation: 3, shadowColor: '#2563eb', shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}
                activeOpacity={0.8}
                onPress={onSubmit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-base">Entrar</Text>
                    <MaterialIcons name="login" size={20} color="#ffffff" />
                  </>
                )}
              </TouchableOpacity>


            </View>

          </View>



        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
