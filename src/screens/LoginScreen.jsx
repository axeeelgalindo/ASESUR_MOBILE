import React, { useState } from "react";
import { KeyboardAvoidingView, Platform } from "react-native";
import { Button, Card, HelperText, Text, TextInput } from "react-native-paper";
import { useAuth } from "../auth/AuthContext";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async () => {
    setError("");
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Error al iniciar sesión");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, justifyContent: "center", padding: 16 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Card style={{ padding: 16 }}>
        <Text variant="headlineMedium" style={{ marginBottom: 6 }}>ASESUR</Text>
        <Text variant="bodyMedium" style={{ marginBottom: 16, opacity: 0.7 }}>
          Inicia sesión para continuar
        </Text>

        <TextInput
          label="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          style={{ marginBottom: 10 }}
        />
        <TextInput
          label="Contraseña"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ marginBottom: 6 }}
        />

        {!!error && <HelperText type="error">{error}</HelperText>}

        <Button mode="contained" onPress={onSubmit} loading={busy} disabled={busy} style={{ marginTop: 8 }}>
          Entrar
        </Button>
      </Card>
    </KeyboardAvoidingView>
  );
}
