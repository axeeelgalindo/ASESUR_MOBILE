import React, { useMemo, useRef, useState, useEffect } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, View, Text, TextInput, TouchableOpacity, Modal, FlatList, TurboModuleRegistry } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import { MaterialIcons } from '@expo/vector-icons';
import chileData from "../utils/comunas.json";
import * as Location from 'expo-location';
import { validateRut, formatRut } from 'rut-kit';

const TOTAL = 6;

const TITLES = {
  1: "Datos del Cliente",
  2: "Dirección de la propiedad",
  3: "Detalles Vivienda / Siniestro",
  4: "Información de contacto",
  5: "Origen del Caso",
  6: "Confirmación del Registro"
};

const DESCRIPTIONS = {
  1: "Por favor, ingrese la información básica del cliente para comenzar el proceso de captación de forma correcta.",
  2: "Ingresa los datos exactos de ubicación para identificar la propiedad geográficamente en el mapa.",
  3: "Complete información técnica adicional sobre la propiedad y el incidente reportado.",
  4: "Complete los datos de contacto y el banco del cliente para proceder con el registro.",
  5: "Indique si el caso es derivado por ASESUR o es una captación propia del asesor.",
  6: "Revise atentamente el resumen de la información ingresada antes de enviar el formulario a la nube central."
};

const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'));
const MONTHS = [
  { id: '01', name: "Enero" }, { id: '02', name: "Febrero" }, { id: '03', name: "Marzo" },
  { id: '04', name: "Abril" }, { id: '05', name: "Mayo" }, { id: '06', name: "Junio" },
  { id: '07', name: "Julio" }, { id: '08', name: "Agosto" }, { id: '09', name: "Septiembre" },
  { id: '10', name: "Octubre" }, { id: '11', name: "Noviembre" }, { id: '12', name: "Diciembre" }
];
const YEARS = Array.from({ length: 100 }, (_, i) => String(new Date().getFullYear() - i));

export default function CaptacionCreateWizard({ navigation }) {
  const { me } = useAuth();
  const scrollRef = useRef(null);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Campos
  const [esCasoAsesur, setEsCasoAsesur] = useState(true);
  const [nombreCliente, setNombreCliente] = useState("");
  const [rutCliente, setRutCliente] = useState("");
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [modalDayVisible, setModalDayVisible] = useState(false);
  const [modalMonthVisible, setModalMonthVisible] = useState(false);
  const [modalYearVisible, setModalYearVisible] = useState(false);

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

  const [emailCliente, setEmailCliente] = useState("");
  const [telefonoCliente1, setTelefonoCliente1] = useState("");
  const [telefonoCliente2, setTelefonoCliente2] = useState("");
  const [banco, setBanco] = useState("");

  // Nuevos campos
  const [numeroDocumentoCI, setNumeroDocumentoCI] = useState("");
  const [antiguedadEdificio, setAntiguedadEdificio] = useState("");
  const [m2ViviendaTotal, setM2ViviendaTotal] = useState("");
  
  // Fecha ocurrencia
  const [occDay, setOccDay] = useState("");
  const [occMonth, setOccMonth] = useState("");
  const [occYear, setOccYear] = useState("");
  const [modalOccDayVisible, setModalOccDayVisible] = useState(false);
  const [modalOccMonthVisible, setModalOccMonthVisible] = useState(false);
  const [modalOccYearVisible, setModalOccYearVisible] = useState(false);

  const [autorizacionAutomatica, setAutorizacionAutomatica] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const canGoNext = useMemo(() => {
    if (step === 1) {
      if (!nombreCliente.trim() || !rutCliente.trim()) return false;
      return validateRut(rutCliente).valid;
    }
    if (step === 2) return !!direccion.trim();
    if (step === 3) return true; // Detalles adicionales son opcionales por ahora
    if (step === 4) return !!(telefonoCliente1.trim() && emailCliente.trim());
    return true;
  }, [step, nombreCliente, rutCliente, direccion, telefonoCliente1, emailCliente]);

  const goTop = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    });
  };

  const next = () => {
    setError("");
    if (!canGoNext) {
      setError("Por favor completa los campos obligatorios de este paso.");
      return;
    }
    setStep((s) => Math.min(TOTAL, s + 1));
    goTop();
  };

  const back = () => {
    setError("");
    if (step === 1) {
      navigation.goBack();
      return;
    }
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
        nombreCliente: nombreCliente.trim(),
        rutCliente: rutCliente.trim(),
        direccion: `${direccion.trim()} ${numeroCalle.trim()} ${depto.trim() ? `, ${depto.trim()}` : ""}`.trim(),
        region: region.trim() || null,
        comuna: comuna.trim() || null,
        emailCliente: emailCliente.trim() || null,
        telefonoCliente1: telefonoCliente1.trim() || null,
        telefonoCliente2: telefonoCliente2.trim() || null,
        banco: banco.trim() || null,
        esCasoAsesur: esCasoAsesur,
        numeroDocumentoCI: numeroDocumentoCI.trim() || null,
        antiguedadEdificio: antiguedadEdificio ? parseInt(antiguedadEdificio, 10) : null,
        m2ViviendaTotal: m2ViviendaTotal ? parseFloat(m2ViviendaTotal) : null,
        autorizacionAutomatica: me?.rol === "ASESOR" ? autorizacionAutomatica : false,
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
      navigation.replace("FotosCaptacion", { casoId: id });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "No se pudo crear la captación. Reintente.");
    } finally {
      setBusy(false);
    }
  };

  const progressPercentage = Math.round((step / TOTAL) * 100);
  const regiones = useMemo(() => chileData.regions || [], []);
  const isMapAvailable = useMemo(() => {
    try { return !!TurboModuleRegistry.get('RNMapsAirModule'); } catch (e) { return false; }
  }, []);

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
        
        // Si no hay streetNumber pero el name contiene números al final
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
            .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/region de |region del |region /g, "") // Quitar prefijos comunes
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
          // Si tenemos la región ya detectada, buscar de preferencia en esa región, de lo contrario en todas
          const searchRegionObj = matchedRegionName ? regiones.find(r => r.name === matchedRegionName) : null;
          const searchIn = searchRegionObj ? searchRegionObj.communes : regiones.flatMap(r => r.communes);
          
          const matchComuna = searchIn.find(c => {
            const cleanC = normalizeStr(c.name);
            return cleanComunaInput.includes(cleanC) || cleanC.includes(cleanComunaInput);
          });
          
          if (matchComuna) {
            setComuna(matchComuna.name);
            // Si no teníamos la región pero encontramos la comuna, asignar la región de esa comuna
            if (!matchedRegionName) {
              const parentRegion = regiones.find(r => r.communes.some(c => c.name === matchComuna.name));
              if (parentRegion) setRegion(parentRegion.name);
            }
          } else {
            // Fallback con primera letra mayúscula
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
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center px-4 py-3 border-b border-slate-200 bg-white shadow-sm z-20">
        <TouchableOpacity onPress={back} className="p-2 absolute left-3 z-30">
          <MaterialIcons name="arrow-back" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-slate-900">Nueva Captación</Text>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} className="flex-1 bg-[#f6f6f8]" bounces={false} contentContainerStyle={{ paddingBottom: 120 }}>
          <View className="bg-white px-6 pt-6 pb-8 shadow-sm rounded-b-3xl">
            <View className="flex-row justify-between items-end mb-3">
              <View>
                <Text className="text-[11px] font-bold text-[#1152d4] uppercase tracking-widest">Paso {step} de {TOTAL}</Text>
                <Text className="text-2xl font-bold text-slate-900 mt-1">{TITLES[step]}</Text>
              </View>
              <Text className="text-sm font-semibold text-slate-500">{progressPercentage}%</Text>
            </View>
            <View className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <View className="bg-[#1152d4] h-full rounded-full" style={{ width: `${progressPercentage}%` }} />
            </View>
            <Text className="text-slate-500 mt-4 leading-relaxed text-[15px]">{DESCRIPTIONS[step]}</Text>
          </View>

          <View className="px-5 py-6 space-y-6">
            {!!error && (
              <View className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex-row items-start gap-3">
                <MaterialIcons name="error-outline" size={20} color="#e11d48" />
                <Text className="text-rose-700 font-medium flex-1">{error}</Text>
              </View>
            )}

            {step === 1 && (
              <View className="space-y-5">
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">Nombre completo del cliente *</Text>
                  <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Ej: Juan Pérez" value={nombreCliente} onChangeText={setNombreCliente} placeholderTextColor="#94a3b8" />
                </View>
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">RUT cliente *</Text>
                  <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="12.345.678-9" value={rutCliente} onChangeText={(val) => setRutCliente(formatRut(val, 'formatted'))} autoCapitalize="characters" placeholderTextColor="#94a3b8" />
                </View>
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">Fecha de nacimiento</Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity className="flex-1 h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalDayVisible(true)}>
                      <Text className={day ? "text-slate-900" : "text-slate-400"}>{day || "Día"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-[1.5] h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalMonthVisible(true)}>
                      <Text className={month ? "text-slate-900" : "text-slate-400"}>{MONTHS.find(m => m.id === month)?.name || "Mes"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-[1.2] h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalYearVisible(true)}>
                      <Text className={year ? "text-slate-900" : "text-slate-400"}>{year || "Año"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">N° Documento C.I.</Text>
                  <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Ej: 123456789" value={numeroDocumentoCI} onChangeText={setNumeroDocumentoCI} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                </View>
              </View>
            )}

            {step === 2 && (
              <View className="space-y-5">
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">Calle / Avenida *</Text>
                  <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Ej: Los Robles" value={direccion} onChangeText={setDireccion} placeholderTextColor="#94a3b8" />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700">Número *</Text>
                    <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="123" value={numeroCalle} onChangeText={setNumeroCalle} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                  </View>
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700">Depto / Ofic.</Text>
                    <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="402" value={depto} onChangeText={setDepto} placeholderTextColor="#94a3b8" />
                  </View>
                </View>
                <TouchableOpacity onPress={handleGetLocation} disabled={loadingLocation} className="mt-2 flex-row items-center gap-2 self-start px-4 py-2 bg-blue-50 rounded-lg border border-blue-100">
                  <MaterialIcons name="my-location" size={18} color="#1152d4" />
                  <Text className="text-[#1152d4] font-bold text-xs uppercase">{loadingLocation ? "Buscando..." : "Ubicación actual"}</Text>
                </TouchableOpacity>
                <View className="flex-row gap-4">
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700">Región</Text>
                    <TouchableOpacity className="h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalRegionVisible(true)}>
                      <Text className={region ? "text-slate-900" : "text-slate-400"} numberOfLines={1}>{region || "Elegir"}</Text>
                    </TouchableOpacity>
                  </View>
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700">Comuna</Text>
                    <TouchableOpacity className="h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => region && setModalComunaVisible(true)}>
                      <Text className={comuna ? "text-slate-900" : "text-slate-400"} numberOfLines={1}>{comuna || "Elegir"}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {step === 3 && (
              <View className="space-y-5">
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">Fecha de ocurrencia</Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity className="flex-1 h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalOccDayVisible(true)}>
                      <Text className={occDay ? "text-slate-900" : "text-slate-400"}>{occDay || "Día"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-[1.5] h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalOccMonthVisible(true)}>
                      <Text className={occMonth ? "text-slate-900" : "text-slate-400"}>{MONTHS.find(m => m.id === occMonth)?.name || "Mes"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-[1.2] h-14 px-4 rounded-xl border border-slate-200 bg-white flex-row items-center justify-between" onPress={() => setModalOccYearVisible(true)}>
                      <Text className={occYear ? "text-slate-900" : "text-slate-400"}>{occYear || "Año"}</Text>
                      <MaterialIcons name="expand-more" size={18} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View className="flex-row gap-4">
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700 ml-1">Antigüedad Edificio (años)</Text>
                    <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Ej: 15" value={antiguedadEdificio} onChangeText={setAntiguedadEdificio} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                  </View>
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700 ml-1">m2 Vivienda Total</Text>
                    <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Ej: 120.5" value={m2ViviendaTotal} onChangeText={setM2ViviendaTotal} keyboardType="numeric" placeholderTextColor="#94a3b8" />
                  </View>
                </View>
              </View>
            )}

            {step === 4 && (
              <View className="space-y-5">
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">Email cliente *</Text>
                  <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="cliente@correo.com" value={emailCliente} onChangeText={setEmailCliente} keyboardType="email-address" autoCapitalize="none" placeholderTextColor="#94a3b8" />
                </View>
                <View className="flex-row gap-4">
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700">Teléfono 1 *</Text>
                    <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="+56 9" value={telefonoCliente1} onChangeText={setTelefonoCliente1} keyboardType="phone-pad" placeholderTextColor="#94a3b8" />
                  </View>
                  <View className="flex-1 space-y-1.5">
                    <Text className="text-sm font-semibold text-slate-700">Teléfono 2</Text>
                    <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Opcional" value={telefonoCliente2} onChangeText={setTelefonoCliente2} keyboardType="phone-pad" placeholderTextColor="#94a3b8" />
                  </View>
                </View>
                <View className="space-y-1.5">
                  <Text className="text-sm font-semibold text-slate-700 ml-1">Banco del Cliente</Text>
                  <TextInput className="w-full h-14 px-4 rounded-xl border border-slate-200 bg-white text-slate-900" placeholder="Ej: Banco Estado, Santander..." value={banco} onChangeText={setBanco} placeholderTextColor="#94a3b8" />
                </View>
              </View>
            )}

            {step === 5 && (
              <View className="space-y-4">
                <TouchableOpacity
                  onPress={() => setEsCasoAsesur(!esCasoAsesur)}
                  activeOpacity={0.8}
                  className={`p-5 rounded-2xl border flex-row items-center justify-between shadow-sm ${esCasoAsesur ? 'border-[#1152d4]/30 bg-[#1152d4]/5' : 'border-slate-200 bg-white'}`}
                >
                  <View className="flex-1 mr-4">
                    <Text className="text-sm font-black text-slate-800 uppercase tracking-widest">Caso ASESUR</Text>
                    <Text className="text-xs text-slate-500 mt-1">{esCasoAsesur ? "Caso entregado por la empresa" : "Captación propia del asesor"}</Text>
                  </View>
                  <View className={`w-12 h-6 rounded-full relative px-1 justify-center ${esCasoAsesur ? 'bg-[#1152d4]' : 'bg-slate-200'}`}>
                    <View className={`w-4 h-4 rounded-full bg-white shadow-sm ${esCasoAsesur ? 'self-end' : 'self-start'}`} />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {step === 6 && (
              <View className="space-y-5">
                <View className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Cliente</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right flex-1 ml-4" numberOfLines={1}>{nombreCliente || "-"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">RUT</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right">{rutCliente || "-"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Dirección</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right flex-1 ml-4" numberOfLines={2}>{`${direccion} ${numeroCalle}`.trim() || "-"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Origen</Text>
                    <Text className={`text-sm font-bold text-right ${esCasoAsesur ? 'text-[#1152d4]' : 'text-amber-600'}`}>{esCasoAsesur ? "Asesur" : "Propio"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Doc. C.I.</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right">{numeroDocumentoCI || "-"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Ocurrencia</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right">{occDay && occMonth && occYear ? `${occDay}/${occMonth}/${occYear}` : "-"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Antigüedad</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right">{antiguedadEdificio ? `${antiguedadEdificio} años` : "-"}</Text>
                  </View>
                  <View className="flex-row justify-between border-b border-slate-100 pb-3">
                    <Text className="text-slate-500 text-[13px]">Superficie</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right">{m2ViviendaTotal ? `${m2ViviendaTotal} m2` : "-"}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-slate-500 text-[13px]">Banco</Text>
                    <Text className="text-slate-900 font-bold text-sm text-right">{banco || "-"}</Text>
                  </View>
                </View>

                {me?.rol === "ASESOR" && (
                  <TouchableOpacity onPress={() => setAutorizacionAutomatica(!autorizacionAutomatica)} className="bg-white rounded-2xl p-5 border border-[#1152d4]/20 flex-row items-center gap-4 shadow-sm">
                    <View className={`w-6 h-6 rounded-lg border-2 items-center justify-center ${autorizacionAutomatica ? 'bg-[#1152d4] border-[#1152d4]' : 'bg-white border-slate-300'}`}>
                      {autorizacionAutomatica && <MaterialIcons name="check" size={18} color="white" />}
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 font-bold text-[15px]">Pasar directo a Pre-Siniestro</Text>
                      <Text className="text-slate-500 text-xs mt-0.5">Autoriza el flujo automático a revisión.</Text>
                    </View>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="absolute bottom-0 w-full px-6 pt-5 pb-10 border-t border-slate-200 bg-white">
        <View className="flex-row gap-4 w-full h-14">
          <TouchableOpacity className={`flex-1 rounded-2xl bg-slate-100 justify-center items-center ${step === 1 ? 'opacity-50' : ''}`} onPress={back} disabled={busy || step === 1}>
            <Text className="text-slate-600 font-bold">Atrás</Text>
          </TouchableOpacity>
          <TouchableOpacity className={`flex-[2] rounded-2xl justify-center items-center bg-[#1152d4]`} onPress={step < TOTAL ? next : submit} disabled={busy}>
            <Text className="text-white font-bold text-base">{busy ? "Enviando..." : step < TOTAL ? "Siguiente" : "Finalizar"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Selectores Modales */}
      <SelectorModal visible={modalDayVisible} title="Día" data={DAYS} value={day} onSelect={setDay} onClose={() => setModalDayVisible(false)} />
      <SelectorModal visible={modalMonthVisible} title="Mes" data={MONTHS} value={month} onSelect={setMonth} onClose={() => setModalMonthVisible(false)} isMonth />
      <SelectorModal visible={modalYearVisible} title="Año" data={YEARS} value={year} onSelect={setYear} onClose={() => setModalYearVisible(false)} />
      <SelectorModal visible={modalOccDayVisible} title="Día Ocurrencia" data={DAYS} value={occDay} onSelect={setOccDay} onClose={() => setModalOccDayVisible(false)} />
      <SelectorModal visible={modalOccMonthVisible} title="Mes Ocurrencia" data={MONTHS} value={occMonth} onSelect={setOccMonth} onClose={() => setModalOccMonthVisible(false)} isMonth />
      <SelectorModal visible={modalOccYearVisible} title="Año Ocurrencia" data={YEARS} value={occYear} onSelect={setOccYear} onClose={() => setModalOccYearVisible(false)} />
      <SelectorModal 
        visible={modalRegionVisible} 
        title="Región" 
        data={regiones.map(r => r.name)} 
        value={region} 
        onSelect={(val) => { 
          if (val !== region) {
            setRegion(val);
            // Solo borrar la comuna si no pertenece a la nueva región
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
    </SafeAreaView>
  );
}

function SelectorModal({ visible, title, data, value, onSelect, onClose, isMonth }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="bg-white rounded-t-3xl h-[60%] pb-8">
          <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
            <Text className="text-lg font-bold text-slate-800">{title}</Text>
            <TouchableOpacity onPress={onClose} className="p-2"><MaterialIcons name="close" size={20} color="#64748b" /></TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(it) => it.id || it}
            renderItem={({ item }) => {
              const itemValue = item.id && isMonth ? item.id : (item.name || item);
              const itemLabel = item.name || item;
              const isSelected = itemValue === value;
              return (
                <TouchableOpacity 
                  className={`py-4 px-6 border-b border-slate-50 flex-row justify-between ${isSelected ? 'bg-blue-50' : ''}`} 
                  onPress={() => { onSelect(itemValue); onClose(); }}
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
