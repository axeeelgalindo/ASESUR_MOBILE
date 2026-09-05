import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  useColorScheme,
} from "react-native";
import { useAuth } from "../auth/AuthContext";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeScreenInsets } from "../utils/safeArea";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const { top: topPadding, bottom: bottomPadding } = useSafeScreenInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const onSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim().toLowerCase(), password);
    } catch (e) {
      console.log("LOGIN ERROR", e?.response?.data || e.message);
      setError(
        e?.response?.data?.message || e.message || "Error al iniciar sesión"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            paddingTop: Math.max(topPadding, 24),
            paddingBottom: Math.max(bottomPadding, 24),
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Login Card */}
          <View
            className="w-full max-w-[420px] bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xl"
            style={{
              shadowColor: "#0f172a",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.08,
              shadowRadius: 20,
              elevation: 4,
            }}
          >
            {/* Top Logo & Welcome Section */}
            <View className="items-center pt-10 pb-4 px-6">
              <View className="w-18 h-18 bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900 rounded-2xl p-2.5 items-center justify-center mb-5 shadow-sm">
                <Image
                  source={require("../../assets/icon.png")}
                  style={{ width: 48, height: 48, borderRadius: 12 }}
                  resizeMode="cover"
                />
              </View>
              <Text className="text-slate-900 dark:text-white text-2xl font-extrabold tracking-tight text-center">
                ASESUR Móvil
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center font-medium">
                Gestión en terreno y captaciones
              </Text>
            </View>

            {/* Login Form */}
            <View className="px-6 pb-8 pt-2">
              {/* Email Field */}
              <View className="mb-4">
                <Text className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
                  Correo electrónico
                </Text>
                <View
                  className={`flex-row items-center rounded-xl border bg-slate-50/80 dark:bg-slate-800/80 px-3.5 h-12 ${
                    focusedField === "email"
                      ? "border-blue-600 bg-white dark:bg-slate-900"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <MaterialIcons
                    name="mail-outline"
                    size={20}
                    color={focusedField === "email" ? "#2563eb" : "#94a3b8"}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    className="flex-1 text-slate-900 dark:text-white text-[15px] h-full"
                    placeholder="usuario@asesur.cl"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocusedField("email")}
                    onBlur={() => setFocusedField(null)}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
                  Contraseña
                </Text>
                <View
                  className={`flex-row items-center rounded-xl border bg-slate-50/80 dark:bg-slate-800/80 px-3.5 h-12 ${
                    focusedField === "password"
                      ? "border-blue-600 bg-white dark:bg-slate-900"
                      : "border-slate-200 dark:border-slate-700"
                  }`}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={20}
                    color={focusedField === "password" ? "#2563eb" : "#94a3b8"}
                    style={{ marginRight: 8 }}
                  />
                  <TextInput
                    className="flex-1 text-slate-900 dark:text-white text-[15px] h-full"
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCorrect={false}
                    spellCheck={false}
                    value={password}
                    onChangeText={setPassword}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                  />
                  <TouchableOpacity
                    className="p-1"
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility-off" : "visibility"}
                      size={20}
                      color="#94a3b8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Error Alert */}
              {!!error && (
                <View className="flex-row items-center bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-3 rounded-xl mb-4">
                  <MaterialIcons
                    name="error-outline"
                    size={18}
                    color="#e11d48"
                    style={{ marginRight: 8 }}
                  />
                  <Text className="text-rose-700 dark:text-rose-300 text-xs font-medium flex-1">
                    {error}
                  </Text>
                </View>
              )}

              {/* Remember Checkbox */}
              <View className="flex-row items-center justify-between py-1 mb-6">
                <TouchableOpacity
                  className="flex-row items-center"
                  onPress={() => setRememberMe(!rememberMe)}
                  activeOpacity={0.7}
                >
                  <View
                    className={`w-5 h-5 rounded-md border items-center justify-center mr-2.5 ${
                      rememberMe
                        ? "bg-blue-600 border-blue-600"
                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                    }`}
                  >
                    {rememberMe && (
                      <MaterialIcons name="check" size={14} color="#ffffff" />
                    )}
                  </View>
                  <Text className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                    Recordarme en este equipo
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity
                className="w-full h-12 bg-blue-600 rounded-xl items-center justify-center flex-row shadow-md"
                style={{
                  shadowColor: "#2563eb",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                activeOpacity={0.7}
                onPress={onSubmit}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-base mr-2">
                      Iniciar Sesión
                    </Text>
                    <MaterialIcons
                      name="arrow-forward"
                      size={18}
                      color="#ffffff"
                    />
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
