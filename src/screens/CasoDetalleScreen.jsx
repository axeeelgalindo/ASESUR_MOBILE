import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  View,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Text,
  Linking,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ImageViewing from "react-native-image-viewing";
import * as DocumentPicker from "expo-document-picker";
import { useSafeScreenInsets } from "../utils/safeArea";

import { api, PUBLIC_URL } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import ModernHeader from "../components/ui/ModernHeader";
import ModernCard from "../components/ui/ModernCard";
import StatusBadge from "../components/ui/StatusBadge";

const { width } = Dimensions.get("window");

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
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => new Date(b.tomadaEn) - new Date(a.tomadaEn));
  }
  return map;
}

function buildComentarioPorParte(grouped) {
  const out = {};
  for (const parte of Object.keys(grouped || {})) {
    const list = grouped[parte] || [];
    const found = list.find((f) => String(f?.titulo || "").trim());
    out[parte] = found ? String(found.titulo).trim() : "";
  }
  return out;
}

export default function CasoDetalleScreen({ route, navigation }) {
  const casoId = route?.params?.id || route?.params?.casoId;

  const { me } = useAuth();
  const { bottom: bottomPadding } = useSafeScreenInsets();

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const [caso, setCaso] = useState(null);
  const [fotos, setFotos] = useState([]);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);

  const [uploadingDoc, setUploadingDoc] = useState(false);

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

  const esInspeccion = useMemo(() => {
    return caso?.estado === "INSPECCION" || caso?.etapa === "SINIESTRO" || caso?.etapa === "PRE_SINIESTRO";
  }, [caso]);

  const openViewer = (parteCasa, startIdx) => {
    const list = (grouped[parteCasa] || []).map((f) => ({
      uri: `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`,
    }));
    if (!list.length) return;

    setViewerImages(list);
    setViewerIndex(Math.max(0, Math.min(startIdx, list.length - 1)));
    setViewerOpen(true);
  };

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

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`).catch(() => {
      Alert.alert("Error", "No se pudo abrir el marcador telefónico.");
    });
  };

  const handleEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email.trim()}`).catch(() => {
      Alert.alert("Error", "No se pudo abrir la app de correo.");
    });
  };

  if (busy) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-slate-400 font-bold text-xs mt-3">
          Cargando detalles del caso...
        </Text>
      </View>
    );
  }

  if (!caso) {
    return (
      <View className="flex-1 bg-[#f8fafc] p-6 justify-center">
        <ModernCard className="items-center p-6">
          <MaterialIcons name="error-outline" size={48} color="#e11d48" />
          <Text className="text-slate-800 font-bold text-base mt-3 text-center">
            {error || "Caso no encontrado"}
          </Text>
          <TouchableOpacity
            className="w-full h-11 bg-blue-600 rounded-xl items-center justify-center mt-5"
            activeOpacity={0.7}
            onPress={load}
          >
            <Text className="text-white font-bold">Reintentar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="w-full h-11 border border-slate-200 rounded-xl items-center justify-center mt-2"
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <Text className="text-slate-600 font-semibold">Volver</Text>
          </TouchableOpacity>
        </ModernCard>
      </View>
    );
  }

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

      <View className="flex-1 bg-[#f8fafc]">
        {/* Modern Unified Header */}
        <ModernHeader
          title={`Folio ${caso?.folio || "-"}`}
          subtitle={caso?.tipo || "Caso"}
          onBack={() => navigation.goBack()}
          rightElement={<StatusBadge status={caso?.estado} size="sm" />}
        />

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: bottomPadding + 36,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          {!!error && (
            <View className="bg-rose-50 p-4 rounded-2xl border border-rose-200 mb-4 flex-row items-center">
              <MaterialIcons name="error-outline" size={20} color="#dc2626" />
              <Text className="text-rose-700 font-semibold text-xs ml-2 flex-1">
                {error}
              </Text>
            </View>
          )}

          {/* Primary Action Button */}
          <TouchableOpacity
            className={`w-full h-14 rounded-2xl flex-row items-center justify-center mb-5 shadow-lg ${
              esInspeccion ? "bg-emerald-600" : "bg-blue-600"
            }`}
            style={{
              shadowColor: esInspeccion ? "#059669" : "#2563eb",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 10,
              elevation: 4,
            }}
            activeOpacity={0.7}
            onPress={() => navigation.navigate("FotosCaptacion", { casoId })}
          >
            <MaterialIcons
              name="photo-camera"
              size={22}
              color="#ffffff"
              style={{ marginRight: 8 }}
            />
            <Text className="text-white font-extrabold text-base">
              {esInspeccion ? "Gestionar Inspección" : "Gestionar Captación"}
            </Text>
          </TouchableOpacity>

          {/* Client Card */}
          <ModernCard className="mb-4">
            <View className="flex-row items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <View className="flex-row items-center">
                <View className="w-8 h-8 rounded-full bg-blue-50 items-center justify-center mr-2.5">
                  <MaterialIcons name="person" size={18} color="#2563eb" />
                </View>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Datos del Titular
                </Text>
              </View>
              {caso?.rutCliente && (
                <View className="bg-slate-100 rounded-md px-2 py-0.5">
                  <Text className="text-[11px] font-bold text-slate-600">
                    RUT {caso.rutCliente}
                  </Text>
                </View>
              )}
            </View>

            <Text className="text-lg font-black text-slate-900 tracking-tight mb-3">
              {caso?.nombreCliente || "Nombre no registrado"}
            </Text>

            {/* Quick Contact Actions */}
            <View className="flex-row gap-2 mb-3">
              {caso?.telefonoCliente1 && (
                <TouchableOpacity
                  className="flex-1 bg-emerald-50 border border-emerald-200/80 rounded-xl py-2 px-3 flex-row items-center justify-center"
                  activeOpacity={0.7}
                  onPress={() => handleCall(caso.telefonoCliente1)}
                >
                  <MaterialIcons
                    name="call"
                    size={16}
                    color="#059669"
                    style={{ marginRight: 6 }}
                  />
                  <Text className="text-emerald-800 font-bold text-xs">
                    {caso.telefonoCliente1}
                  </Text>
                </TouchableOpacity>
              )}

              {caso?.emailCliente && (
                <TouchableOpacity
                  className="flex-1 bg-blue-50 border border-blue-200/80 rounded-xl py-2 px-3 flex-row items-center justify-center"
                  activeOpacity={0.7}
                  onPress={() => handleEmail(caso.emailCliente)}
                >
                  <MaterialIcons
                    name="mail"
                    size={16}
                    color="#2563eb"
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    className="text-blue-800 font-bold text-xs"
                    numberOfLines={1}
                  >
                    Email
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Address */}
            <View className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-row items-start">
              <MaterialIcons
                name="location-on"
                size={18}
                color="#d97706"
                style={{ marginRight: 6, marginTop: 1 }}
              />
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-800">
                  {caso?.direccion || "Sin dirección especificada"}
                </Text>
                <Text className="text-[11px] font-semibold text-slate-500 uppercase mt-0.5">
                  {caso?.comuna || "-"} {caso?.region ? `• ${caso.region}` : ""}
                </Text>
              </View>
            </View>
          </ModernCard>

          {/* Gallery Section */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-3 px-1">
              <View className="flex-row items-center">
                <MaterialIcons name="collections" size={18} color="#64748b" />
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1.5">
                  Evidencia Fotográfica
                </Text>
              </View>
              <View className="bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                <Text className="text-blue-700 text-[11px] font-extrabold">
                  {totalFotos} fotos
                </Text>
              </View>
            </View>

            {totalFotos === 0 ? (
              <ModernCard className="p-8 items-center border-dashed">
                <View className="w-14 h-14 rounded-full bg-slate-50 items-center justify-center mb-3">
                  <MaterialIcons name="add-a-photo" size={28} color="#94a3b8" />
                </View>
                <Text className="text-slate-700 font-bold text-sm text-center">
                  Sin fotos registradas
                </Text>
                <Text className="text-slate-400 text-xs text-center mt-1">
                  Ingresa a gestionar para capturar imágenes.
                </Text>
              </ModernCard>
            ) : (
              PARTES.filter((p) => (grouped[p]?.length || 0) > 0).map((parte) => {
                const list = grouped[parte] || [];
                const count = list.length;
                const comentario = String(comentarioPorParte[parte] || "").trim();
                const containerWidth = width - 32;
                const imageSize = (containerWidth - 32 - 16) / 3;

                return (
                  <ModernCard key={parte} className="mb-3.5">
                    <View className="flex-row justify-between items-center mb-3 pb-2 border-b border-slate-100">
                      <Text className="font-extrabold text-xs tracking-wide text-slate-800 uppercase">
                        {prettyParte(parte)}
                      </Text>
                      <View className="bg-slate-100 px-2 py-0.5 rounded-md">
                        <Text className="text-[10px] text-slate-600 font-bold">
                          {count} {count === 1 ? "foto" : "fotos"}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row flex-wrap -mx-1">
                      {list.map((f, idx) => {
                        const uri = `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`;
                        const canDel = canDeletePhoto(f);

                        return (
                          <View
                            key={f.id}
                            style={{
                              width: imageSize,
                              height: imageSize,
                              padding: 3,
                            }}
                          >
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => openViewer(parte, idx)}
                              className="w-full h-full rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200/60 shadow-sm"
                            >
                              <Image
                                source={{ uri }}
                                className="w-full h-full"
                                resizeMode="cover"
                              />
                            </TouchableOpacity>

                            {canDel && (
                              <TouchableOpacity
                                className="absolute top-1 right-1 w-6 h-6 bg-rose-500 rounded-full items-center justify-center shadow-sm"
                                onPress={() => confirmDelete(f)}
                              >
                                <MaterialIcons
                                  name="close"
                                  size={14}
                                  color="white"
                                />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                      <View
                        style={{
                          width: imageSize,
                          height: imageSize,
                          padding: 3,
                        }}
                      >
                        <TouchableOpacity
                          className="w-full h-full rounded-xl bg-slate-50 border-2 border-dashed border-slate-200 items-center justify-center"
                          activeOpacity={0.7}
                          onPress={() =>
                            navigation.navigate("FotosCaptacion", { casoId })
                          }
                        >
                          <MaterialIcons
                            name="add-photo-alternate"
                            size={22}
                            color="#94a3b8"
                          />
                          <Text className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                            Añadir
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {!!comentario && (
                      <View className="mt-3 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/50 flex-row items-start">
                        <MaterialIcons
                          name="format-quote"
                          size={14}
                          color="#d97706"
                          style={{ marginTop: 2, marginRight: 4 }}
                        />
                        <Text className="text-xs text-slate-700 font-medium flex-1 italic leading-tight">
                          {comentario}
                        </Text>
                      </View>
                    )}
                  </ModernCard>
                );
              })
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}