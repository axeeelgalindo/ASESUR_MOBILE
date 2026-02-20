import React, { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import {
  Button,
  Card,
  HelperText,
  Text,
  TextInput,
  Divider,
} from "react-native-paper";
import StepHeader from "../components/StepHeader";
import { api } from "../../api/client";
import { useAuth } from "../auth/AuthContext";

const TOTAL = 5;

export default function CaptacionCreateWizard({ navigation }) {
  const { me } = useAuth();

  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Campos
  const [nombreCliente, setNombreCliente] = useState("");
  const [rutCliente, setRutCliente] = useState("");

  const [direccion, setDireccion] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [comuna, setComuna] = useState("");

  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente1, setTelefonoCliente1] = useState("");
  const [telefonoCliente2, setTelefonoCliente2] = useState("");
  const [cuentaCorriente, setCuentaCorriente] = useState("");

  const [banco, setBanco] = useState("");
  const [companiaSeguro, setCompaniaSeguro] = useState("");
  const [bancoHipotecado, setBancoHipotecado] = useState("");

  const [numeroSiniestro, setNumeroSiniestro] = useState("");
  const [nombreLiquidador, setNombreLiquidador] = useState("");
  const [emailLiquidador, setEmailLiquidador] = useState("");
  const [telefonoLiquidador, setTelefonoLiquidador] = useState("");
  const [nombreAnalista, setNombreAnalista] = useState("");

  const canGoNext = useMemo(() => {
    if (step === 1) return !!(nombreCliente.trim() && rutCliente.trim());
    if (step === 2) return !!direccion.trim();
    if (step === 3) return !!(telefonoCliente1.trim() && emailCliente.trim());
    return true;
  }, [
    step,
    nombreCliente,
    rutCliente,
    direccion,
    telefonoCliente1,
    emailCliente,
  ]);

  const goTop = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const next = () => {
    setError("");
    if (!canGoNext) {
      setError("Completa los campos obligatorios de este paso.");
      return;
    }
    setStep((s) => Math.min(TOTAL, s + 1));
    goTop();
  };

  const back = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
    goTop();
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const body = {
        etapa: "CAPTACION",
        estado: "ABIERTO",
        tipo: "HIPOTECARIO_A",

        nombreCliente: nombreCliente.trim(),
        rutCliente: rutCliente.trim(),
        direccion: direccion.trim(),

        ciudad: ciudad.trim() || null,
        comuna: comuna.trim() || null,

        emailCliente: emailCliente.trim() || null,
        telefonoCliente1: telefonoCliente1.trim() || null,
        telefonoCliente2: telefonoCliente2.trim() || null,
        cuentaCorriente: cuentaCorriente.trim() || null,

        banco: banco.trim() || null,
        companiaSeguro: companiaSeguro.trim() || null,
        bancoHipotecado: bancoHipotecado.trim() || null,

        numeroSiniestro: numeroSiniestro.trim() || null,
        nombreLiquidador: nombreLiquidador.trim() || null,
        emailLiquidador: emailLiquidador.trim() || null,
        telefonoLiquidador: telefonoLiquidador.trim() || null,
        nombreAnalista: nombreAnalista.trim() || null,
      };

      const res = await api.post("/casos", body);
      const id = res.data?.caso?.id;

      if (!id) throw new Error("No llegó casoId");

      // ✅ ir directo a sacar fotos
      navigation.replace("FotosCaptacion", { casoId: id });
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e.message ||
          "No se pudo crear la captación"
      );
    } finally {
      setBusy(false);
    }
  };

  const SectionTitle = ({ children }) => (
    <Text variant="titleMedium" style={{ marginBottom: 8 }}>
      {children}
    </Text>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 12 }}>
        <Card style={{ padding: 12 }}>
          <StepHeader title="Captación" step={step} total={TOTAL} />

          <Text style={{ marginBottom: 10, opacity: 0.7 }}>
            Usuario: {me?.email} • Rol: {me?.rol}
          </Text>

          <Divider style={{ marginBottom: 12 }} />

          {step === 1 ? (
            <View>
              <SectionTitle>Datos del cliente</SectionTitle>

              <TextInput
                label="Nombre cliente *"
                value={nombreCliente}
                onChangeText={setNombreCliente}
                style={{ marginBottom: 10 }}
                returnKeyType="next"
              />

              <TextInput
                label="RUT cliente *"
                value={rutCliente}
                onChangeText={setRutCliente}
                style={{ marginBottom: 10 }}
                autoCapitalize="characters"
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View>
              <SectionTitle>Dirección</SectionTitle>

              <TextInput
                label="Dirección *"
                value={direccion}
                onChangeText={setDireccion}
                style={{ marginBottom: 10 }}
              />

              <TextInput
                label="Ciudad"
                value={ciudad}
                onChangeText={setCiudad}
                style={{ marginBottom: 10 }}
              />

              <TextInput
                label="Comuna"
                value={comuna}
                onChangeText={setComuna}
                style={{ marginBottom: 10 }}
              />
            </View>
          ) : null}

          {step === 3 ? (
            <View>
              <SectionTitle>Contacto</SectionTitle>

              <TextInput
                label="Email *"
                autoCapitalize="none"
                keyboardType="email-address"
                value={emailCliente}
                onChangeText={setEmailCliente}
                style={{ marginBottom: 10 }}
              />

              <TextInput
                label="Fono 1 *"
                keyboardType="phone-pad"
                value={telefonoCliente1}
                onChangeText={setTelefonoCliente1}
                style={{ marginBottom: 10 }}
              />

              <TextInput
                label="Fono 2"
                keyboardType="phone-pad"
                value={telefonoCliente2}
                onChangeText={setTelefonoCliente2}
                style={{ marginBottom: 10 }}
              />

              <TextInput
                label="Cuenta corriente"
                value={cuentaCorriente}
                onChangeText={setCuentaCorriente}
                style={{ marginBottom: 10 }}
              />
            </View>
          ) : null}

          {step === 4 ? (
            <View>
              <SectionTitle>Opcionales</SectionTitle>

              <TextInput
                label="Banco"
                value={banco}
                onChangeText={setBanco}
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Compañía seguro"
                value={companiaSeguro}
                onChangeText={setCompaniaSeguro}
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Banco hipotecado"
                value={bancoHipotecado}
                onChangeText={setBancoHipotecado}
                style={{ marginBottom: 10 }}
              />

              <Divider style={{ marginVertical: 10 }} />

              <TextInput
                label="N° siniestro"
                value={numeroSiniestro}
                onChangeText={setNumeroSiniestro}
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Nombre liquidador"
                value={nombreLiquidador}
                onChangeText={setNombreLiquidador}
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Email liquidador"
                autoCapitalize="none"
                keyboardType="email-address"
                value={emailLiquidador}
                onChangeText={setEmailLiquidador}
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Fono liquidador"
                keyboardType="phone-pad"
                value={telefonoLiquidador}
                onChangeText={setTelefonoLiquidador}
                style={{ marginBottom: 10 }}
              />
              <TextInput
                label="Nombre analista"
                value={nombreAnalista}
                onChangeText={setNombreAnalista}
                style={{ marginBottom: 10 }}
              />
            </View>
          ) : null}

          {step === 5 ? (
            <View>
              <SectionTitle>Confirmar</SectionTitle>

              <Text style={{ marginBottom: 6 }}>
                • Cliente: {nombreCliente || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • RUT: {rutCliente || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • Dirección: {direccion || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • Ciudad/Comuna: {ciudad || "-"} / {comuna || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • Email: {emailCliente || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • Fono 1/2: {telefonoCliente1 || "-"} /{" "}
                {telefonoCliente2 || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • CC: {cuentaCorriente || "-"}
              </Text>
              <Text style={{ marginBottom: 6 }}>
                • Compañía: {companiaSeguro || "-"}
              </Text>
            </View>
          ) : null}

          {!!error ? <HelperText type="error">{error}</HelperText> : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
            <Button
              mode="outlined"
              onPress={back}
              disabled={step === 1 || busy}
              style={{ flex: 1 }}
            >
              Atrás
            </Button>

            {step < TOTAL ? (
              <Button
                mode="contained"
                onPress={next}
                disabled={busy}
                style={{ flex: 1 }}
              >
                Siguiente
              </Button>
            ) : (
              <Button
                mode="contained"
                onPress={submit}
                loading={busy}
                disabled={busy}
                style={{ flex: 1 }}
              >
                Crear Captación
              </Button>
            )}
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
