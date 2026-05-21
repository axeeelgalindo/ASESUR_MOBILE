// src/screens/CasoDetalleScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, View, Pressable, Alert, TouchableOpacity, ActivityIndicator, SafeAreaView, Dimensions, Text } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import ImageViewing from "react-native-image-viewing";
import * as DocumentPicker from "expo-document-picker";

import { api, PUBLIC_URL } from "../../api/client";
import { useAuth } from "../auth/AuthContext";

const { width } = Dimensions.get('window');

const PARTES = [
  "FACHADA",
  "LIVING_COMEDOR",
  "COCINA",
  "DORMITORIO_PRINCIPAL",
  "DORMITORIO_SECUNDARIO",
  "BANO",
  "PASILLO",
  "ESCALERA",
  "TECHUMBRE",
  "TECHO",
  "PATIO",
  "GARAGE",
  "LOGGIA",
  "OTRO",
];

function prettyParte(p) {
  return String(p || "OTRO").replaceAll("_", " ");
}

function groupByParte(fotos = []) {
  const map = {};
  for (const f of fotos) {
    const k = f.parteCasa || "OTRO";
    if (!map[k]) map[k] = [];
    map[k].push(f);
  }
  // más nuevas primero
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => new Date(b.tomadaEn) - new Date(a.tomadaEn));
  }
  return map;
}

/**
 * Comentario por parte:
 * toma el último `titulo` no vacío dentro de esa parte
 */
function buildComentarioPorParte(grouped) {
  const out = {};
  for (const parte of Object.keys(grouped || {})) {
    const list = grouped[parte] || [];
    const found = list.find((f) => String(f?.titulo || "").trim());
    out[parte] = found ? String(found.titulo).trim() : "";
  }
  return out;
}

const getEstadoStyle = (estado) => {
  if (estado === "ABIERTO") return "bg-green-100 text-green-700";
  if (estado === "CERRADO") return "bg-slate-100 text-slate-600";
  return "bg-blue-100 text-blue-700";
};

export default function CasoDetalleScreen({ route, navigation }) {
  const casoId = route?.params?.id || route?.params?.casoId;

  const { me } = useAuth();

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const [caso, setCaso] = useState(null);
  const [fotos, setFotos] = useState([]);

  // visor zoom
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);

  // document upload (inspector)
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const pickAndUploadInspectionDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (res.canceled) return;

      const file = res.assets[0];
      setUploadingDoc(true);

      const formData = new FormData();
      formData.append("titulo", "Archivo de Inspección App");
      formData.append("tipo", "INSPECCION_ASESUR");

      // En React Native (Expo) el FormData para archivos locales usa { uri, name, type }
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      });

      // El endpoint de Siniestros requiere multipart/form-data
      await api.post(`/siniestros/${casoId}/documentos`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      Alert.alert("Éxito", "Archivo de inspección subido correctamente.");
      await load();
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se pudo subir el archivo de inspección."
      );
    } finally {
      setUploadingDoc(false);
    }
  };

  const load = useCallback(async () => {
    if (!casoId) return;
    setBusy(true);
    setError("");
    try {
      const [rCaso, rFotos] = await Promise.all([
        api.get(`/casos/${casoId}`),
        api.get(`/casos/${casoId}/fotos`),
      ]);

      setCaso(rCaso?.data?.caso || rCaso?.data || null);
      setFotos(rFotos?.data?.fotos || []);
    } catch (e) {
      setError(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se pudo cargar el caso"
      );
    } finally {
      setBusy(false);
    }
  }, [casoId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const grouped = useMemo(() => groupByParte(fotos), [fotos]);
  const comentarioPorParte = useMemo(
    () => buildComentarioPorParte(grouped),
    [grouped]
  );
  const totalFotos = useMemo(() => fotos?.length || 0, [fotos]);

  const openViewer = (parteCasa, startIdx) => {
    const list = (grouped[parteCasa] || []).map((f) => ({
      uri: `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`,
    }));
    if (!list.length) return;

    setViewerImages(list);
    setViewerIndex(Math.max(0, Math.min(startIdx, list.length - 1)));
    setViewerOpen(true);
  };

  const openGalleryForCaso = () => {
    const list = (fotos || []).map((f) => ({
      uri: `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`,
    }));
    if (!list.length) return;

    setViewerImages(list);
    setViewerIndex(0);
    setViewerOpen(true);
  };

  // permisos para eliminar
  const canDeletePhoto = (f) => {
    const rol = me?.rol;
    const myId = me?.id || me?.sub || me?.userId;

    if (rol === "SUPERADMIN" || rol === "OPERACIONES") return true;

    if (
      (rol === "CAPTADOR" || rol === "INSPECTOR" || rol === "ASESOR") &&
      f?.subidoPorId &&
      myId
    ) {
      return f.subidoPorId === myId;
    }
    return false;
  };

  const confirmDelete = (foto) => {
    if (!foto?.id) return;

    if (!canDeletePhoto(foto)) {
      Alert.alert("Sin permiso", "Solo puedes eliminar fotos que tú subiste.");
      return;
    }

    Alert.alert(
      "Eliminar foto",
      "¿Seguro que deseas eliminar esta foto? Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(`/casos/${casoId}/fotos/${foto.id}`);
              await load();
            } catch (e) {
              Alert.alert(
                "Error",
                e?.response?.data?.message ||
                e?.response?.data?.error ||
                "No se pudo eliminar la foto"
              );
            }
          },
        },
      ]
    );
  };

  if (busy) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f6f6f8]">
        <ActivityIndicator size="large" color="#1152d4" />
      </View>
    );
  }

  if (!caso) {
    return (
      <SafeAreaView className="flex-1 bg-[#f6f6f8] p-4">
        <View className="bg-white rounded-xl p-4 shadow-sm">
          <Text className="text-red-500 font-bold mb-4">
            {error || "Caso no encontrado"}
          </Text>
          <TouchableOpacity
            className="w-full h-12 border border-slate-200 rounded-lg justify-center items-center mb-2"
            onPress={load}
          >
            <Text className="text-slate-700 font-semibold">Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="w-full h-12 justify-center items-center"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-[#1152d4] font-semibold">Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const estadoClass = getEstadoStyle(caso?.estado);

  return (
    <>
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerOpen}
        onRequestClose={() => setViewerOpen(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      <SafeAreaView className="flex-1 bg-[#f0f2f5]">
        <View className="flex-1 bg-[#f0f2f5]">

          {/* Top App Bar Premium */}
          <View className="flex-row items-center px-4 py-4 bg-white border-b border-slate-200 z-10" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 3 }}>
            <TouchableOpacity
              className="w-10 h-10 items-center justify-center rounded-full bg-slate-50 active:bg-slate-100"
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back-ios" size={18} color="#334155" style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <View className="flex-1 ml-4 justify-center">
              <Text className="text-lg font-extrabold text-slate-900 tracking-tight" numberOfLines={1}>
                Folio {caso?.folio || "-"}
              </Text>
              <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Detalle del Caso
              </Text>
            </View>
            <View className="w-10 h-10 items-center justify-center rounded-full bg-blue-50">
              <MaterialIcons name="info-outline" size={20} color="#1152d4" />
            </View>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 48, paddingTop: 20 }} showsVerticalScrollIndicator={false}>
            {!!error && (
              <View className="bg-red-50 p-4 rounded-xl border border-red-200 mb-6 flex-row items-center">
                <MaterialIcons name="error-outline" size={24} color="#dc2626" />
                <Text className="text-red-700 font-semibold ml-3 flex-1">{error}</Text>
              </View>
            )}

            {/* Status & Type Cards */}
            <View className="flex-row flex-wrap gap-2 mb-6">
              <View className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg flex-row items-center shadow-sm" style={{ elevation: 1 }}>
                <MaterialIcons name="flag" size={14} color="#64748b" className="mr-1.5" />
                <Text className="text-[11px] font-bold uppercase tracking-wider text-slate-600 ml-1.5">{caso?.etapa || "-"}</Text>
              </View>
              <View className={`px-4 py-1.5 rounded-lg border flex-row items-center shadow-sm ${estadoClass.split(' ').find(c => c.startsWith('bg-'))} ${estadoClass.split(' ').find(c => c.startsWith('border-')) || 'border-transparent'}`} style={{ elevation: 1 }}>
                <MaterialIcons name="trip-origin" size={14} color={estadoClass.includes('green') ? '#15803d' : estadoClass.includes('slate') ? '#475569' : '#1d4ed8'} />
                <Text className={`text-[11px] font-bold uppercase tracking-wider ml-1.5 ${estadoClass.split(' ').find(c => c.startsWith('text-'))}`}>{caso?.estado || "-"}</Text>
              </View>
              <View className="px-4 py-1.5 bg-[#1152d4]/10 border border-[#1152d4]/20 rounded-lg flex-row items-center shadow-sm" style={{ elevation: 1 }}>
                <MaterialIcons name="category" size={14} color="#1152d4" />
                <Text className="text-[11px] font-bold uppercase tracking-wider text-[#1152d4] ml-1.5">{caso?.tipo || "-"}</Text>
              </View>
            </View>

            {/* Case Info Section */}
            <View className="mb-6">
              <View className="flex-row items-center mb-3 px-1">
                <MaterialIcons name="assignment-ind" size={18} color="#94a3b8" />
                <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-widest ml-1.5">Datos del Cliente</Text>
              </View>

              <View className="bg-white rounded-2xl p-5 border border-slate-200" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>

                {/* Cliente */}
                <View className="flex-row items-center mb-4">
                  <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center mr-3 border border-blue-100">
                    <MaterialIcons name="person" size={20} color="#1152d4" />
                  </View>
                  <View className="flex-1 border-b border-slate-50 pb-3">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cliente Titular</Text>
                    <Text className="text-[15px] font-bold text-slate-900">{caso?.nombreCliente || "No registrado"}</Text>
                  </View>
                </View>

                {/* RUT */}
                {caso?.rutCliente && (
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-full bg-slate-50 items-center justify-center mr-3 border border-slate-100">
                      <MaterialIcons name="badge" size={20} color="#64748b" />
                    </View>
                    <View className="flex-1 border-b border-slate-50 pb-3">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">RUT Titular</Text>
                      <Text className="text-[15px] font-bold text-slate-800">{caso?.rutCliente}</Text>
                    </View>
                  </View>
                )}

                {/* Email */}
                {caso?.emailCliente && (
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-full bg-amber-50 items-center justify-center mr-3 border border-amber-100">
                      <MaterialIcons name="alternate-email" size={18} color="#d97706" />
                    </View>
                    <View className="flex-1 border-b border-slate-50 pb-3">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Correo Electrónico</Text>
                      <Text className="text-[14px] font-semibold text-slate-700">{caso?.emailCliente}</Text>
                    </View>
                  </View>
                )}

                {/* Fono */}
                {(caso?.telefonoCliente1 || caso?.telefonoCliente2) && (
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center mr-3 border border-emerald-100">
                      <MaterialIcons name="phone" size={18} color="#059669" />
                    </View>
                    <View className="flex-1 border-b border-slate-50 pb-3">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Teléfono de Contacto</Text>
                      <Text className="text-[14px] font-semibold text-slate-700">
                        {caso?.telefonoCliente1 || ""}{caso?.telefonoCliente2 ? ` / ${caso.telefonoCliente2}` : ""}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Dirección y Ubicación */}
                <View className="flex-row items-start mb-4">
                  <View className="w-10 h-10 rounded-full bg-rose-50 items-center justify-center mr-3 border border-rose-100 mt-1">
                    <MaterialIcons name="location-on" size={20} color="#e11d48" />
                  </View>
                  <View className="flex-1 border-b border-slate-50 pb-3">
                    <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dirección de la Propiedad</Text>
                    <Text className="text-[14px] font-bold text-slate-800 leading-tight mb-1">
                      {caso?.direccion || "No especificada"}
                    </Text>
                    {(caso?.comuna || caso?.region) && (
                      <Text className="text-[12px] font-semibold text-rose-600 uppercase tracking-wider">
                        {caso?.comuna || "-"} {caso?.region ? `• ${caso.region}` : ""}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Cuenta Corriente */}
                {caso?.numeroCuenta && (
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-indigo-50 items-center justify-center mr-3 border border-indigo-100">
                      <MaterialIcons name="account-balance" size={18} color="#4f46e5" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Cuenta Bancaria</Text>
                      <Text className="text-[14px] font-semibold text-slate-700">{caso?.numeroCuenta}</Text>
                    </View>
                  </View>
                )}

              </View>
            </View>

            {/* Botón de Subir Archivo (Solo Inspector) */}
            {me?.rol === "INSPECTOR" && (
              <View className="mb-4 mt-2">
                <TouchableOpacity
                  className="w-full h-[60px] bg-emerald-600 rounded-2xl flex-row items-center justify-center gap-3 relative overflow-hidden"
                  style={{ elevation: 6, shadowColor: '#059669', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
                  activeOpacity={0.85}
                  onPress={pickAndUploadInspectionDocument}
                  disabled={uploadingDoc}
                >
                  <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                  {uploadingDoc ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <MaterialIcons name="upload-file" size={26} color="white" />
                  )}
                  <Text className="text-white font-extrabold text-[17px] tracking-wide">
                    {uploadingDoc ? "Subiendo..." : "Subir Archivo Inspección"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Action Button Prominente */}
            <View className="mb-8 mt-2">
              <TouchableOpacity
                className="w-full h-[60px] bg-[#1152d4] rounded-2xl flex-row items-center justify-center gap-3 relative overflow-hidden"
                style={{ elevation: 6, shadowColor: '#1152d4', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } }}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("FotosCaptacion", { casoId })}
              >
                {/* Decorative background glow */}
                <View className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                <MaterialIcons name="photo-camera" size={26} color="white" />
                <Text className="text-white font-extrabold text-[17px] tracking-wide">Gestionar Fotos Captación</Text>
              </TouchableOpacity>
            </View>

            {/* Gallery Section */}
            <View className="mb-8">
              <View className="flex-row justify-between items-center mb-4 px-1">
                <View className="flex-row items-center">
                  <MaterialIcons name="collections" size={18} color="#94a3b8" />
                  <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-widest ml-1.5">Galería Fotográfica</Text>
                </View>
                <View className="bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm" style={{ elevation: 1 }}>
                  <Text className="text-[#1152d4] text-[11px] font-black">{totalFotos} ARCHIVOS</Text>
                </View>
              </View>

              {totalFotos === 0 && (
                <View className="bg-white p-8 rounded-2xl border border-slate-200 items-center shadow-sm" style={{ elevation: 1 }}>
                  <View className="w-16 h-16 rounded-full bg-slate-50 items-center justify-center mb-4 border border-slate-100">
                    <MaterialIcons name="add-a-photo" size={32} color="#cbd5e1" />
                  </View>
                  <Text className="text-slate-600 font-bold text-center text-[15px] mb-1">Sin evidencia fotográfica</Text>
                  <Text className="text-slate-400 text-center font-medium text-[12px]">Toca el botón superior para añadir fotos.</Text>
                </View>
              )}

              {PARTES.filter((p) => (grouped[p]?.length || 0) > 0).map((parte) => {
                const list = grouped[parte] || [];
                const count = list.length;
                const comentario = String(comentarioPorParte[parte] || "").trim();
                const containerWidth = width - 32; // Total width minus horizontal padding
                const imageSize = (containerWidth - 32 - 16) / 3; // 3 columns with 8px padding internal and spacing

                return (
                  <View key={parte} className="mb-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm" style={{ elevation: 1 }}>
                    <View className="flex-row justify-between items-center mb-4 border-b border-slate-50 pb-3">
                      <View className="flex-row items-center">
                        <MaterialIcons name="drive-file-rename-outline" size={16} color="#64748b" />
                        <Text className="font-extrabold text-[14px] tracking-tight text-slate-800 ml-1.5">{prettyParte(parte)}</Text>
                      </View>
                      <View className="bg-slate-100 px-2 py-0.5 rounded">
                        <Text className="text-[10px] text-slate-500 font-bold">{count} f.</Text>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
                      {list.map((f, idx) => {
                        const uri = `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`;
                        const canDel = canDeletePhoto(f);

                        return (
                          <View key={f.id} style={{ width: imageSize, height: imageSize, padding: 4 }}>
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => openViewer(parte, idx)}
                              className="w-full h-full rounded-xl bg-slate-100 overflow-hidden relative shadow-sm"
                              style={{ elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 }}
                            >
                              <Image
                                source={{ uri }}
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            </TouchableOpacity>

                            {/* icono eliminar */}
                            {canDel && (
                              <TouchableOpacity
                                className="absolute top-0 right-0 w-7 h-7 bg-red-500/90 rounded-bl-xl rounded-tr-xl items-center justify-center border-b border-l border-red-600/50"
                                onPress={() => confirmDelete(f)}
                              >
                                <MaterialIcons name="close" size={16} color="white" />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                      {/* Botón de añadir más (visual a la pantalla de subir) */}
                      <View style={{ width: imageSize, height: imageSize, padding: 4 }}>
                        <TouchableOpacity
                          className="w-full h-full rounded-xl bg-slate-50 border-2 border-dashed border-slate-300 items-center justify-center"
                          onPress={() => navigation.navigate("FotosCaptacion", { casoId })}
                          activeOpacity={0.6}
                        >
                          <MaterialIcons name="add-photo-alternate" size={26} color="#94a3b8" />
                          <Text className="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-wider">Añadir</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!!comentario && (
                      <View className="mt-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex-row items-start">
                        <MaterialIcons name="format-quote" size={16} color="#d97706" style={{ marginTop: 2, marginRight: 4 }} />
                        <Text className="text-[13px] text-slate-700 font-medium flex-1 italic leading-tight">{comentario}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Assignment Section */}


          </ScrollView>
        </View>
      </SafeAreaView>
    </>
  );
}