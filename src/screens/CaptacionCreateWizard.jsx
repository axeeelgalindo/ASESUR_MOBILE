import React, { useMemo, useRef, useState, useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput, TouchableOpacity, Modal, FlatList, BackHandler, Keyboard, TurboModuleRegistry } from "react-native";
import { useSafeScreenInsets } from "../utils/safeArea";
import { api } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import { MaterialIcons } from '@expo/vector-icons';
import chileData from "../utils/comunas.json";
import * as Location from 'expo-location';
import { validateRut } from 'rut-kit';
import bancosData from "../utils/bancos.json";
import CalendarPickerModal, { MONTHS } from "../components/CalendarPickerModal";
import ScalePressable from "../components/ui/ScalePressable";

const TOTAL = 5;

const TITLES = {
  1: "Datos del Cliente",
  2: "Dirección de la propiedad",
  3: "Contacto y Vivienda",
  4: "Origen del Caso",
  5: "Confirmación del Registro"
};

const DESCRIPTIONS = {
  1: "Por favor, ingrese la información básica del cliente para comenzar el proceso de captación de forma correcta.",
  2: "Ingresa los datos exactos de ubicación para identificar la propiedad geográficamente en el mapa.",
  3: "Complete los datos de contacto del cliente y las características físicas de la vivienda.",
  4: "Indique si el caso es derivado por ASESUR o es una captación propia del asesor.",
  5: "Indique la fecha de ocurrencia del siniestro y revise atentamente el resumen antes de finalizar el registro."
};

// Formateador de RUT chileno seguro para Android (evita bucles y duplicación tipo 181818)
export function formatRutSafe(raw) {
  if (!raw) return "";
  let clean = String(raw).replace(/[^0-9kK]/g, "").toUpperCase();
  if (clean.length > 9) clean = clean.slice(0, 9);
  if (clean.length <= 1) return clean;

  const cuerpo = clean.slice(0, -1);
  const dv = clean.slice(-1);

  let formattedCuerpo = "";
  let count = 0;
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    formattedCuerpo = cuerpo[i] + formattedCuerpo;
    count++;
    if (count % 3 === 0 && i !== 0) {
      formattedCuerpo = "." + formattedCuerpo;
    }
  }
  return `${formattedCuerpo}-${dv}`;
}

export default function CaptacionCreateWizard({ navigation }) {
  const { me } = useAuth();
  const { top: topPadding, bottom: bottomPadding } = useSafeScreenInsets();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Modales interactivos profesionales
  const [showExitModal, setShowExitModal] = useState(false);
  const [showFinishModal, setShowFinishModal] = useState(false);

  // Manejo de teclado dinámico para evitar que tape inputs en Android/iOS
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Paso 1: Datos del cliente
  const [nombreCliente, setNombreCliente] = useState("");
  const [rutCliente, setRutCliente] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [numeroDocumentoCI, setNumeroDocumentoCI] = useState("");
  const [birthDateModalVisible, setBirthDateModalVisible] = useState(false);

  // Paso 2: Dirección
  const [direccion, setDireccion] = useState("");
  const [numeroCalle, setNumeroCalle] = useState("");
  const [depto, setDepto] = useState("");
  const [region, setRegion] = useState("");
  const [comuna, setComuna] = useState("");
  const [coordinates, setCoordinates] = useState({ latitude: -33.4489, longitude: -70.6693 });
  const [hasLocation, setHasLocation] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [modalRegionVisible, setModalRegionVisible] = useState(false);
  const [modalComunaVisible, setModalComunaVisible] = useState(false);

  // Paso 3: Contacto y Vivienda (Fusión)
  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente1, setTelefonoCliente1] = useState("");
  const [telefonoCliente2, setTelefonoCliente2] = useState("");
  const [banco, setBanco] = useState("");
  const [otroBanco, setOtroBanco] = useState("");
  const [modalBancoVisible, setModalBancoVisible] = useState(false);
  const [antiguedadEdificio, setAntiguedadEdificio] = useState("");
  const [m2ViviendaTotal, setM2ViviendaTotal] = useState("");

  // Paso 4: Origen
  const [esCasoAsesur, setEsCasoAsesur] = useState(true);

  // Paso 5: Confirmación y Fecha Ocurrencia
  const [occDay, setOccDay] = useState("");
  const [occMonth, setOccMonth] = useState("");
  const [occYear, setOccYear] = useState("");
  const [occDateModalVisible, setOccDateModalVisible] = useState(false);

  const [autorizacionAutomatica, setAutorizacionAutomatica] = useState(false);

  const canAutoPre = useMemo(() => {
    return me?.rol === "ASESOR" || me?.rol === "GERENTE" || me?.rol === "SUPERADMIN" || me?.rol === "MASTER";
  }, [me]);

  const stepRef = useRef(step);
  stepRef.current = step;

  const isNavigatingAwayRef = useRef(false);
  const pendingActionRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
      gestureEnabled: false,
    });
  }, [navigation]);

  // Interceptar cualquier intento de navegación hacia atrás (gestos de iOS, navegación externa, etc.)
  useEffect(() => {
    const unsubscribe = navigation.addListener("beforeRemove", (e) => {
      if (isNavigatingAwayRef.current) {
        return;
      }

      // Evita salir inmediatamente de la pantalla
      e.preventDefault();

      if (stepRef.current > 1) {
        // Si no está en el paso 1, retrocede al paso anterior sin perder ningún dato
        setStep((s) => Math.max(1, s - 1));
        goTop();
      } else {
        // Si está en el paso 1, solicita confirmación con el modal
        pendingActionRef.current = e.data.action;
        setShowExitModal(true);
      }
    });

    return unsubscribe;
  }, [navigation]);

  // Manejo de confirmación al salir con modal personalizado
  const handleExitPrompt = () => {
    setShowExitModal(true);
  };

  // Interceptar botón físico Atrás en Android
  useEffect(() => {
    const backAction = () => {
      if (showExitModal || showFinishModal) {
        setShowExitModal(false);
        setShowFinishModal(false);
        return true;
      }
      if (step === 1) {
        handleExitPrompt();
        return true;
      } else {
        setStep((s) => Math.max(1, s - 1));
        goTop();
        return true;
      }
    };
    const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => backHandler.remove();
  }, [step, showExitModal, showFinishModal]);

  const canGoNext = useMemo(() => {
    if (step === 1) {
      if (!nombreCliente.trim() || !rutCliente.trim()) return false;
      const clean = rutCliente.replace(/[^0-9kK]/g, "");
      return clean.length >= 8 && validateRut(rutCliente).valid;
    }
    if (step === 2) return !!direccion.trim();
    if (step === 3) return !!(telefonoCliente1.trim() && emailCliente.trim());
    return true;
  }, [step, nombreCliente, rutCliente, direccion, telefonoCliente1, emailCliente]);

  const goTop = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const scrollToInput = (yOffset = 280) => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 100);
  };

  const next = () => {
    setError("");
    if (!canGoNext) {
      if (step === 1) {
        setError("Por favor ingresa un nombre y un RUT chileno válido.");
      } else if (step === 2) {
        setError("Por favor ingresa la calle / dirección.");
      } else if (step === 3) {
        setError("Por favor ingresa el email y al menos el teléfono 1.");
      } else {
        setError("Por favor completa los campos obligatorios de este paso.");
      }
      return;
    }
    setStep((s) => Math.min(TOTAL, s + 1));
    goTop();
  };

  const back = () => {
    setError("");
    if (step === 1) {
      handleExitPrompt();
      return;
    }
    setStep((s) => Math.max(1, s - 1));
    goTop();
  };

  const submit = async () => {
    setShowFinishModal(false);
    setBusy(true);
    setError("");
    try {
      const body = {
        etapa: "CAPTACION",
        estado: "ABIERTO",
        nombreCliente: nombreCliente.trim(),
        rutCliente: rutCliente.trim(),
        direccion: `${direccion.trim()} ${numeroCalle.trim()} ${depto.trim() ? `, ${depto.trim()}` : ""}`.trim(),
        region: region.trim() || null,
        comuna: comuna.trim() || null,
        emailCliente: emailCliente.trim() ? emailCliente.trim().toLowerCase() : null,
        telefonoCliente1: telefonoCliente1.trim() || null,
        telefonoCliente2: telefonoCliente2.trim() || null,
        banco: banco === "Otro" ? (otroBanco.trim() || "Otro") : (banco.trim() || null),
        esCasoAsesur: esCasoAsesur,
        numeroDocumentoCI: numeroDocumentoCI.trim() || null,
        antiguedadEdificio: antiguedadEdificio ? parseInt(antiguedadEdificio, 10) : null,
        m2ViviendaTotal: m2ViviendaTotal ? parseFloat(m2ViviendaTotal) : null,
        autorizacionAutomatica: canAutoPre ? autorizacionAutomatica : false,
      };

      if (day && month && year) {
        body.fechaNacimiento = `${year}-${month}-${day}`;
      }
      if (occDay && occMonth && occYear) {
        body.fechaOcurrencia = `${occYear}-${occMonth}-${occDay}`;
      }

      const res = await api.post("/casos", body);
      const id = res.data?.caso?.id;

      if (!id) throw new Error("No llegó casoId desde el servidor.");
      isNavigatingAwayRef.current = true;
      navigation.replace("FotosCaptacion", { casoId: id });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "No se pudo crear la captación. Reintente.");
    } finally {
      setBusy(false);
    }
  };

  const progressPercentage = Math.round((step / TOTAL) * 100);
  const regiones = useMemo(() => chileData.regions || [], []);

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    setError("");
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError("Permiso de ubicación denegado.");
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      setCoordinates({ latitude, longitude });
      setHasLocation(true);

      let reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (reverse.length > 0) {
        const item = reverse[0];

        let parsedNumber = item.streetNumber || "";
        let parsedStreet = item.street || item.name || "";

        if (!parsedNumber && item.name) {
          const match = item.name.match(/(.+?)\s+(\d+)$/);
          if (match) {
            parsedStreet = match[1];
            parsedNumber = match[2];
          }
        }

        setDireccion(parsedStreet);
        setNumeroCalle(parsedNumber);

        const normalizeStr = (str) =>
          (str || "").toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/region de |region del |region /g, "")
            .trim();

        let matchedRegionName = "";
        if (item.region) {
          const cleanInput = normalizeStr(item.region);
          const matchRegion = regiones.find(r => {
            const cleanR = normalizeStr(r.name);
            return cleanInput.includes(cleanR) || cleanR.includes(cleanInput);
          });
          if (matchRegion) {
            matchedRegionName = matchRegion.name;
            setRegion(matchRegion.name);
          }
        }

        const rawComuna = item.city || item.subregion || item.district || "";
        if (rawComuna) {
          const cleanComunaInput = normalizeStr(rawComuna);
          const searchRegionObj = matchedRegionName ? regiones.find(r => r.name === matchedRegionName) : null;
          const searchIn = searchRegionObj ? searchRegionObj.communes : regiones.flatMap(r => r.communes);

          const matchComuna = searchIn.find(c => {
            const cleanC = normalizeStr(c.name);
            return cleanComunaInput.includes(cleanC) || cleanComunaInput.includes(cleanC);
          });

          if (matchComuna) {
            setComuna(matchComuna.name);
            if (!matchedRegionName) {
              const parentRegion = regiones.find(r => r.communes.some(c => c.name === matchComuna.name));
              if (parentRegion) setRegion(parentRegion.name);
            }
          } else {
            setComuna(rawComuna.charAt(0).toUpperCase() + rawComuna.slice(1));
          }
        }
      }
    } catch (e) {
      setError("No se pudo obtener la ubicación. Verifique su GPS.");
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header Superior con navegación entre pasos y confirmación de salida con Safe Area */}
      <View
        style={{
          paddingTop: topPadding,
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#e2e8f0",
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 2,
          zIndex: 20,
        }}
      >
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity onPress={back} className="p-2 rounded-full flex-row items-center">
            <MaterialIcons name="arrow-back" size={24} color="#334155" />
          </TouchableOpacity>
          <Text className="text-center text-lg font-extrabold text-slate-900 tracking-tight">Nueva Captación</Text>
          <TouchableOpacity onPress={handleExitPrompt} className="px-3 py-1.5 rounded-xl">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider">Salir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          ref={scrollRef}
          className="flex-1 bg-[#f6f6f8]"
          bounces={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 100 }}
        >
          {/* Header de Progreso */}
          <View className="bg-white px-6 pt-5 pb-7 shadow-sm rounded-b-3xl border-b border-slate-100">
            <View className="flex-row justify-between items-end mb-3">
              <View>
                <View className="flex-row items-center gap-1.5 mb-1">
                  <View className="w-2 h-2 rounded-full bg-[#1152d4]" />
                  <Text className="text-[11px] font-black text-[#1152d4] uppercase tracking-widest">Paso {step} de {TOTAL}</Text>
                </View>
                <Text className="text-2xl font-black text-slate-900 tracking-tight">{TITLES[step]}</Text>
              </View>
              <View className="px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                <Text className="text-xs font-black text-[#1152d4]">{progressPercentage}%</Text>
              </View>
            </View>
            <View className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <View className="bg-[#1152d4] h-full rounded-full" style={{ width: `${progressPercentage}%` }} />
            </View>
            <Text className="text-slate-500 mt-3.5 leading-relaxed text-[14px] font-medium">{DESCRIPTIONS[step]}</Text>
          </View>

          <View className="px-5 py-6">
            {!!error && (
              <View className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex-row items-start gap-3 mb-5 shadow-sm">
                <MaterialIcons name="error-outline" size={22} color="#e11d48" />
                <Text className="text-rose-700 font-semibold flex-1 leading-snug">{error}</Text>
              </View>
            )}

            {/* PASO 1: Datos del Cliente */}
            {step === 1 && (
              <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Nombre completo del cliente *</Text>
                  <TextInput
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                    placeholder="Ej: Juan Pérez González"
                    value={nombreCliente}
                    onChangeText={setNombreCliente}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">RUT cliente *</Text>
                  <TextInput
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-bold"
                    placeholder="12.345.678-9"
                    value={rutCliente}
                    onChangeText={(val) => setRutCliente(formatRutSafe(val))}
                    autoCapitalize="characters"
                    maxLength={12}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Fecha de nacimiento</Text>
                  <TouchableOpacity
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                    onPress={() => setBirthDateModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-xl bg-blue-50 items-center justify-center">
                        <MaterialIcons name="cake" size={18} color="#1152d4" />
                      </View>
                      <Text className={day && month && year ? "text-slate-900 font-bold text-sm" : "text-slate-400 font-medium text-sm"}>
                        {day && month && year ? `${day} de ${MONTHS.find(m => m.id === month)?.name || month}, ${year}` : "Seleccionar fecha (Año → Mes → Día)"}
                      </Text>
                    </View>
                    <MaterialIcons name="calendar-today" size={18} color="#1152d4" />
                  </TouchableOpacity>
                </View>
                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">N° Documento C.I.</Text>
                  <TextInput
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                    placeholder="Ej: 123456789"
                    value={numeroDocumentoCI}
                    onChangeText={setNumeroDocumentoCI}
                    keyboardType="numeric"
                    placeholderTextColor="#94a3b8"
                    onFocus={() => scrollToInput(250)}
                  />
                </View>
              </View>
            )}

            {/* PASO 2: Dirección de la Propiedad */}
            {step === 2 && (
              <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Calle / Avenida *</Text>
                  <TextInput
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                    placeholder="Ej: Los Robles"
                    value={direccion}
                    onChangeText={setDireccion}
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Número *</Text>
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                      placeholder="123"
                      value={numeroCalle}
                      onChangeText={setNumeroCalle}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Depto / Ofic.</Text>
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                      placeholder="402"
                      value={depto}
                      onChangeText={setDepto}
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleGetLocation}
                  disabled={loadingLocation}
                  activeOpacity={0.7}
                  className="my-1 flex-row items-center justify-center gap-2 py-3 bg-blue-50 rounded-2xl border border-blue-200"
                >
                  <MaterialIcons name="my-location" size={18} color="#1152d4" />
                  <Text className="text-[#1152d4] font-black text-xs uppercase tracking-wider">
                    {loadingLocation ? "Detectando GPS..." : "Obtener mi ubicación actual"}
                  </Text>
                </TouchableOpacity>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Región</Text>
                    <TouchableOpacity className="h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center justify-between" onPress={() => setModalRegionVisible(true)}>
                      <Text className={region ? "text-slate-900 font-bold" : "text-slate-400"} numberOfLines={1}>{region || "Elegir"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Comuna</Text>
                    <TouchableOpacity className="h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center justify-between" onPress={() => region && setModalComunaVisible(true)}>
                      <Text className={comuna ? "text-slate-900 font-bold" : "text-slate-400"} numberOfLines={1}>{comuna || "Elegir"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* PASO 3: Información de Contacto y Vivienda (Fusión) */}
            {step === 3 && (
              <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Email cliente *</Text>
                  <TextInput
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                    placeholder="cliente@correo.com"
                    value={emailCliente}
                    onChangeText={setEmailCliente}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor="#94a3b8"
                  />
                </View>

                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Teléfono 1 *</Text>
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                      placeholder="+56 9 1234 5678"
                      value={telefonoCliente1}
                      onChangeText={setTelefonoCliente1}
                      keyboardType="phone-pad"
                      placeholderTextColor="#94a3b8"
                      onFocus={() => scrollToInput(150)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Teléfono 2</Text>
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                      placeholder="Opcional"
                      value={telefonoCliente2}
                      onChangeText={setTelefonoCliente2}
                      keyboardType="phone-pad"
                      placeholderTextColor="#94a3b8"
                      onFocus={() => scrollToInput(150)}
                    />
                  </View>
                </View>

                <View>
                  <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Banco del Cliente</Text>
                  <TouchableOpacity
                    className="h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                    onPress={() => setModalBancoVisible(true)}
                  >
                    <Text className={banco ? "text-slate-900 font-bold" : "text-slate-400"} numberOfLines={1}>
                      {banco === "Otro" && otroBanco.trim() ? `Otro: ${otroBanco}` : (banco || "Seleccionar Banco")}
                    </Text>
                    <MaterialIcons name="expand-more" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                  {banco === "Otro" && (
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 mt-2 font-medium"
                      placeholder="Escribe el nombre del banco o institución..."
                      value={otroBanco}
                      onChangeText={setOtroBanco}
                      placeholderTextColor="#94a3b8"
                      onFocus={() => scrollToInput(250)}
                    />
                  )}
                </View>

                <View className="flex-row gap-3 pt-2 border-t border-slate-100">
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">Antigüedad (años)</Text>
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                      placeholder="Ej: 15"
                      value={antiguedadEdificio}
                      onChangeText={setAntiguedadEdificio}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                      onFocus={() => scrollToInput(320)}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-black text-slate-600 uppercase tracking-wider mb-2 ml-0.5">m2 Vivienda Total</Text>
                    <TextInput
                      className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-900 font-medium"
                      placeholder="Ej: 120.5"
                      value={m2ViviendaTotal}
                      onChangeText={setM2ViviendaTotal}
                      keyboardType="numeric"
                      placeholderTextColor="#94a3b8"
                      onFocus={() => scrollToInput(320)}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* PASO 4: Origen del Caso */}
            {step === 4 && (
              <View className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <Text className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2">Asignación de origen</Text>
                <TouchableOpacity
                  onPress={() => setEsCasoAsesur(!esCasoAsesur)}
                  activeOpacity={0.8}
                  className={`p-5 rounded-2xl border flex-row items-center justify-between ${esCasoAsesur ? 'border-[#1152d4] bg-blue-50/50' : 'border-slate-200 bg-slate-50'}`}
                >
                  <View className="flex-1 mr-4">
                    <Text className="text-base font-black text-slate-900">{esCasoAsesur ? "Caso ASESUR" : "Captación Propia"}</Text>
                    <Text className="text-xs text-slate-500 mt-1">
                      {esCasoAsesur ? "Caso derivado y asignado por la empresa ASESUR" : "Caso captado de forma independiente por el asesor"}
                    </Text>
                  </View>
                  <View className={`w-14 h-8 rounded-full relative px-1 justify-center ${esCasoAsesur ? 'bg-[#1152d4]' : 'bg-slate-300'}`}>
                    <View className={`w-6 h-6 rounded-full bg-white shadow-md ${esCasoAsesur ? 'self-end' : 'self-start'}`} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* PASO 5: Confirmación del Registro y Fecha Ocurrencia (Con separación y padding profesional) */}
            {step === 5 && (
              <View>
                {/* Caja 1: Selector de Fecha de Ocurrencia */}
                <View className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-5">
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center">
                        <MaterialIcons name="event" size={18} color="#1152d4" />
                      </View>
                      <Text className="text-sm font-black text-slate-900 uppercase tracking-wider">Fecha de ocurrencia</Text>
                    </View>
                    <View className="px-2 py-0.5 bg-amber-50 rounded-md border border-amber-200">
                      <Text className="text-[10px] font-black text-amber-700 uppercase">Siniestro</Text>
                    </View>
                  </View>
                  <Text className="text-xs text-slate-500 mb-4 font-medium">
                    Indica el día aproximado en que se produjo el incidente o daño reportado por el cliente.
                  </Text>
                  <TouchableOpacity
                    className="w-full h-14 px-4 rounded-2xl border border-slate-200 bg-slate-50 flex-row items-center justify-between"
                    onPress={() => setOccDateModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-8 h-8 rounded-xl bg-amber-50 items-center justify-center">
                        <MaterialIcons name="event-available" size={18} color="#d97706" />
                      </View>
                      <Text className={occDay && occMonth && occYear ? "text-slate-900 font-bold text-sm" : "text-slate-400 font-medium text-sm"}>
                        {occDay && occMonth && occYear ? `${occDay} de ${MONTHS.find(m => m.id === occMonth)?.name || occMonth}, ${occYear}` : "Seleccionar fecha (Año → Mes → Día)"}
                      </Text>
                    </View>
                    <MaterialIcons name="calendar-month" size={20} color="#d97706" />
                  </TouchableOpacity>
                </View>

                {/* Caja 2: Resumen Completo del Caso con espaciado amplio */}
                <View className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 mb-5">
                  <View className="flex-row items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                    <View className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                      <MaterialIcons name="fact-check" size={18} color="#059669" />
                    </View>
                    <Text className="text-sm font-black text-slate-900 uppercase tracking-wider">Resumen de la Captación</Text>
                  </View>

                  <View className="space-y-3">
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Cliente</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right flex-1 ml-4" numberOfLines={1}>{nombreCliente || "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">RUT</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{rutCliente || "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Dirección</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right flex-1 ml-4" numberOfLines={2}>{`${direccion} ${numeroCalle}`.trim() || "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Origen</Text>
                      <Text className={`text-xs font-black uppercase tracking-wider text-right ${esCasoAsesur ? 'text-[#1152d4]' : 'text-amber-600'}`}>{esCasoAsesur ? "Asesur" : "Propio"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Email</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right flex-1 ml-4" numberOfLines={1}>{emailCliente || "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Teléfono</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{telefonoCliente1 || "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Doc. C.I.</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{numeroDocumentoCI || "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Ocurrencia</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{occDay && occMonth && occYear ? `${occDay}/${occMonth}/${occYear}` : "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Antigüedad</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{antiguedadEdificio ? `${antiguedadEdificio} años` : "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5 border-b border-slate-50">
                      <Text className="text-slate-500 text-xs font-semibold">Superficie</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{m2ViviendaTotal ? `${m2ViviendaTotal} m2` : "-"}</Text>
                    </View>
                    <View className="flex-row justify-between py-1.5">
                      <Text className="text-slate-500 text-xs font-semibold">Banco</Text>
                      <Text className="text-slate-900 font-bold text-sm text-right">{banco === "Otro" && otroBanco ? otroBanco : (banco || "-")}</Text>
                    </View>
                  </View>
                </View>

                {/* Caja 3: Opción de paso automático para Asesor / Gerente / Superadmin */}
                {canAutoPre && (
                  <TouchableOpacity
                    onPress={() => setAutorizacionAutomatica(!autorizacionAutomatica)}
                    className="bg-white rounded-3xl p-5 border border-[#1152d4]/30 mb-6 flex-row items-center gap-4 shadow-sm"
                    activeOpacity={0.8}
                  >
                    <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${autorizacionAutomatica ? 'bg-[#1152d4] border-[#1152d4]' : 'bg-white border-slate-300'}`}>
                      {autorizacionAutomatica && <MaterialIcons name="check" size={18} color="white" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 font-extrabold text-[15px]">¿Pasar directo a pre-siniestro?</Text>
                      <Text className="text-slate-500 text-xs mt-0.5 font-medium">Autoriza el traspaso automático a revisión de liquidación.</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* BOTONES ATRÁS / SIGUIENTE / FINALIZAR AL FINAL DE LOS CAMPOS */}
            <View className="mt-4 mb-16">
              <View className="flex-row gap-4 w-full h-14">
                <ScalePressable
                  className={`flex-1 rounded-2xl bg-slate-200 border border-slate-300/60 justify-center items-center ${busy ? 'opacity-50' : ''}`}
                  onPress={back}
                  disabled={busy}
                >
                  <Text className="text-slate-700 font-bold text-base uppercase">Volver</Text>
                </ScalePressable>
                <ScalePressable
                  className="flex-[2] rounded-2xl justify-center items-center bg-blue-600 shadow-md"
                  onPress={step < TOTAL ? next : () => setShowFinishModal(true)}
                  disabled={busy}
                >
                  <Text className="text-white font-black text-base uppercase tracking-wider">
                    {busy ? "Enviando..." : step < TOTAL ? "Siguiente" : "Finalizar"}
                  </Text>
                </ScalePressable>
              </View>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ==================================================== */}
      {/* MODAL PERSONALIZADO 1: CONFIRMAR SALIDA DEL FORMULARIO */}
      {/* ==================================================== */}
      <Modal visible={showExitModal} transparent animationType="fade" onRequestClose={() => setShowExitModal(false)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl items-center border border-slate-100">
            <View className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 items-center justify-center mb-4">
              <MaterialIcons name="warning-amber" size={34} color="#d97706" />
            </View>
            <Text className="text-xl font-black text-slate-900 text-center mb-2">¿Salir del formulario?</Text>
            <Text className="text-sm text-slate-500 text-center leading-relaxed mb-6 font-medium">
              Si sales ahora se perderán todos los datos que has ingresado en esta captación.
            </Text>
            <View className="w-full gap-3">
              <ScalePressable
                className="w-full h-13 py-3.5 bg-blue-600 rounded-2xl items-center justify-center shadow-md"
                onPress={() => setShowExitModal(false)}
              >
                <Text className="text-white font-extrabold text-base">Continuar editando</Text>
              </ScalePressable>
              <ScalePressable
                className="w-full h-12 py-3 bg-slate-100 rounded-2xl items-center justify-center border border-slate-200"
                onPress={() => {
                  isNavigatingAwayRef.current = true;
                  setShowExitModal(false);
                  if (pendingActionRef.current) {
                    navigation.dispatch(pendingActionRef.current);
                  } else {
                    navigation.goBack();
                  }
                }}
              >
                <Text className="text-rose-600 font-bold text-sm">Salir sin guardar</Text>
              </ScalePressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* MODAL PERSONALIZADO 2: CONFIRMAR REGISTRO Y FINALIZAR */}
      {/* ==================================================== */}
      <Modal visible={showFinishModal} transparent animationType="fade" onRequestClose={() => setShowFinishModal(false)}>
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl items-center border border-slate-100">
            <View className="w-16 h-16 rounded-full bg-blue-50 border border-blue-200 items-center justify-center mb-4">
              <MaterialIcons name="task-alt" size={36} color="#2563eb" />
            </View>
            <Text className="text-xl font-black text-slate-900 text-center mb-2">Confirmar Registro</Text>
            <Text className="text-sm text-slate-500 text-center leading-relaxed mb-4 font-medium">
              ¿Estás seguro de finalizar y crear este caso en la plataforma central de ASESUR?
            </Text>

            <View className="w-full bg-slate-50 rounded-2xl p-3.5 border border-slate-200 mb-6 space-y-1">
              <Text className="text-xs font-bold text-slate-800" numberOfLines={1}>👤 {nombreCliente || "Cliente"}</Text>
              <Text className="text-xs text-slate-600 font-medium">🆔 RUT: {rutCliente}</Text>
              <Text className="text-xs text-slate-600 font-medium" numberOfLines={1}>📍 {direccion} {numeroCalle}</Text>
            </View>

            <View className="w-full gap-3">
              <ScalePressable
                className="w-full h-13 py-3.5 bg-blue-600 rounded-2xl items-center justify-center shadow-md"
                onPress={submit}
              >
                <Text className="text-white font-extrabold text-base">Subir información</Text>
              </ScalePressable>
              <ScalePressable
                className="w-full h-12 py-3 bg-slate-100 rounded-2xl items-center justify-center border border-slate-200"
                onPress={() => setShowFinishModal(false)}
              >
                <Text className="text-slate-700 font-bold text-sm">Volver</Text>
              </ScalePressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendario Modal Interactivo: Fecha de Nacimiento (Año -> Mes -> Día) */}
      <CalendarPickerModal
        visible={birthDateModalVisible}
        title="Fecha de Nacimiento"
        initialDay={day}
        initialMonth={month}
        initialYear={year}
        onSelect={({ day: d, month: m, year: y }) => {
          setDay(d);
          setMonth(m);
          setYear(y);
        }}
        onClose={() => setBirthDateModalVisible(false)}
        minYear={1920}
        maxYear={new Date().getFullYear()}
      />

      {/* Calendario Modal Interactivo: Fecha de Ocurrencia (Año -> Mes -> Día) */}
      <CalendarPickerModal
        visible={occDateModalVisible}
        title="Fecha de Ocurrencia del Siniestro"
        initialDay={occDay}
        initialMonth={occMonth}
        initialYear={occYear}
        onSelect={({ day: d, month: m, year: y }) => {
          setOccDay(d);
          setOccMonth(m);
          setOccYear(y);
        }}
        onClose={() => setOccDateModalVisible(false)}
        minYear={new Date().getFullYear() - 15}
        maxYear={new Date().getFullYear()}
      />

      <SelectorModal
        visible={modalRegionVisible}
        title="Región"
        data={regiones.map(r => r.name)}
        value={region}
        onSelect={(val) => {
          if (val !== region) {
            setRegion(val);
            const newRegionObj = regiones.find(r => r.name === val);
            const hasCommune = newRegionObj?.communes.some(c => c.name === comuna);
            if (!hasCommune) {
              setComuna("");
            }
          }
        }}
        onClose={() => setModalRegionVisible(false)}
      />
      <SelectorModal visible={modalComunaVisible} title="Comuna" data={regiones.find(r => r.name === region)?.communes.map(c => c.name) || []} value={comuna} onSelect={setComuna} onClose={() => setModalComunaVisible(false)} />

      <SelectorModal
        visible={modalBancoVisible}
        title="Banco del Cliente"
        data={bancosData}
        value={banco}
        onSelect={(val) => {
          setBanco(val);
          if (val !== "Otro") setOtroBanco("");
        }}
        onClose={() => setModalBancoVisible(false)}
        searchable
      />
    </View>
  );
}

function SelectorModal({ visible, title, data, value, onSelect, onClose, isMonth, searchable }) {
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!searchable || !search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(it => {
      const label = it.id && isMonth ? it.id : (it.name || it);
      return String(label).toLowerCase().includes(q);
    });
  }, [data, search, searchable, isMonth]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl h-[65%] pb-8">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
            <Text className="text-lg font-bold text-slate-800">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2"><MaterialIcons name="close" size={20} color="#64748b" /></TouchableOpacity>
          </View>

          {searchable && (
            <View className="px-6 py-3 border-b border-slate-100">
              <View className="flex-row items-center bg-slate-100 rounded-xl px-3 py-2">
                <MaterialIcons name="search" size={20} color="#94a3b8" />
                <TextInput
                  className="flex-1 ml-2 text-sm text-slate-800 p-0"
                  placeholder="Buscar banco..."
                  value={search}
                  onChangeText={setSearch}
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                />
                {!!search && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <MaterialIcons name="cancel" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          <FlatList
            data={filteredData}
            keyExtractor={(it) => it.id || it}
            renderItem={({ item }) => {
              const itemValue = item.id && isMonth ? item.id : (item.name || item);
              const itemLabel = item.name || item;
              const isSelected = itemValue === value;
              return (
                <TouchableOpacity
                  className={`py-4 px-6 border-b border-slate-50 flex-row justify-between ${isSelected ? 'bg-blue-50' : ''}`}
                  onPress={() => { onSelect(itemValue); onClose(); setSearch(""); }}
                >
                  <Text className={`text-base ${isSelected ? 'font-bold text-[#1152d4]' : 'text-slate-700'}`}>{itemLabel}</Text>
                  {isSelected && <MaterialIcons name="check" size={20} color="#1152d4" />}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
