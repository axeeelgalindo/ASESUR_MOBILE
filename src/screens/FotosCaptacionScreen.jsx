// src/screens/FotosCaptacionScreen.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, View, Pressable, Alert, AppState, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { Text } from "react-native-paper";
import { MaterialIcons } from '@expo/vector-icons';
import ImageViewing from "react-native-image-viewing";
import { api, PUBLIC_URL } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import { processQueue } from "../mobile/uploads/uploadQueue";

export const PARTES = [
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
  "FIRMA_NOTARIAL",
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

function getLastCommentByParte(grouped) {
  const out = {};
  for (const p of PARTES) {
    const list = grouped[p] || [];
    const last = list?.[0]?.titulo ? String(list[0].titulo) : "";
    out[p] = last;
  }
  return out;
}

export default function FotosCaptacionScreen({ route, navigation }) {
  const { casoId } = route.params;

  const { me } = useAuth();
  const [autoPre, setAutoPre] = useState(true);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [fotos, setFotos] = useState([]);

  // comentario (draft) por parte + guardando estado por parte
  const [comentarioPorParte, setComentarioPorParte] = useState({});
  const [savingParte, setSavingParte] = useState({}); // { FACHADA: true }

  // visor
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);

  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const res = await api.get(`/casos/${casoId}/fotos`);
      const list = res.data?.fotos || [];
      setFotos(list);

      // inicializa draft con último comentario guardado por parte (solo si no existe)
      const groupedTmp = groupByParte(list);
      const lastComments = getLastCommentByParte(groupedTmp);
      setComentarioPorParte((prev) => {
        const next = { ...prev };
        for (const p of PARTES) {
          if (next[p] == null) next[p] = lastComments[p] || "";
        }
        return next;
      });
    } catch (e) {
      setError(e?.response?.data?.message || e?.response?.data?.error || "No se pudieron cargar las fotos");
    } finally {
      setBusy(false);
    }
  }, [casoId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });

    const unsub = navigation.addListener("focus", async () => {
      try {
        await processQueue(); // Expo Go friendly
      } catch { }
      await load();
    });

    return unsub;
  }, [navigation, load]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active") {
        try {
          await processQueue();
        } catch { }
      }
    });
    return () => sub.remove();
  }, []);

  const grouped = useMemo(() => groupByParte(fotos), [fotos]);

  const counts = useMemo(() => {
    const c = {};
    for (const p of PARTES) c[p] = grouped[p]?.length || 0;
    return c;
  }, [grouped]);

  const faltantes = useMemo(() => PARTES.filter((p) => (counts[p] || 0) < 1), [counts]);
  const allOk = fotos.length >= 1;

  const openCamera = (parteCasa) => {
    // mandamos el comentario draft como titulo (se guarda al subir foto)
    const titulo = comentarioPorParte[parteCasa] || "";
    navigation.navigate("TomarFoto", { casoId, parteCasa, titulo });
  };

  const openViewer = (parteCasa, startIdx) => {
    const list = (grouped[parteCasa] || []).map((f) => ({
      uri: `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`,
    }));
    setViewerImages(list);
    setViewerIndex(Math.max(0, Math.min(startIdx, list.length - 1)));
    setViewerOpen(true);
  };

  const canDeletePhoto = (f) => {
    const rol = me?.rol;
    const myId = me?.id || me?.sub || me?.userId;

    if (rol === "SUPERADMIN" || rol === "OPERACIONES") return true;

    if ((rol === "CAPTADOR" || rol === "INSPECTOR" || rol === "ASESOR") && f?.subidoPorId && myId) {
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

    Alert.alert("Eliminar foto", "¿Seguro que deseas eliminar esta foto? Esta acción no se puede deshacer.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`/casos/${casoId}/fotos/${foto.id}`);
            await load();
          } catch (e) {
            Alert.alert("Error", e?.response?.data?.message || "No se pudo eliminar la foto");
          }
        },
      },
    ]);
  };

  const saveCommentForParte = async (parteCasa) => {
    const list = grouped[parteCasa] || [];
    const latest = list?.[0]; // más reciente
    if (!latest?.id) return;

    const draft = String(comentarioPorParte[parteCasa] || "").trim();
    setSavingParte((prev) => ({ ...prev, [parteCasa]: true }));
    try {
      await api.patch(`/casos/${casoId}/fotos/${latest.id}`, { titulo: draft || null });
      await load();
      Alert.alert("Éxito", "Comentario guardado exitosamente");
    } catch (e) {
      Alert.alert("Error", e?.response?.data?.message || e?.response?.data?.error || "No se pudo guardar el comentario");
    } finally {
      setSavingParte((prev) => ({ ...prev, [parteCasa]: false }));
    }
  };

  if (busy) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f6f6f8]">
        <ActivityIndicator size="large" color="#1152d4" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerOpen}
        onRequestClose={() => setViewerOpen(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      <SafeAreaView className="flex-1 bg-[#f0f2f5]">

        {/* Top Navigation Bar Premium */}
        <View className="flex-row items-center px-4 py-4 bg-white border-b border-slate-200 z-50 justify-between" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 3 }}>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 active:bg-slate-100"
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={20} color="#334155" />
            </TouchableOpacity>
            <View>
              <Text className="text-lg font-extrabold tracking-tight text-slate-900">Fotos Captación</Text>
              <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gestor de Evidencia</Text>
            </View>
          </View>
          <View className="w-10 h-10 items-center justify-center rounded-full bg-blue-50">
            <MaterialIcons name="collections" size={20} color="#1152d4" />
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
          {!!error && (
            <View className="m-4 bg-red-50 p-4 rounded-xl border border-red-200 flex-row items-center">
              <MaterialIcons name="error-outline" size={24} color="#dc2626" />
              <View className="flex-1 ml-3">
                <Text className="text-red-700 font-bold mb-1">{error}</Text>
              </View>
              <TouchableOpacity className="bg-red-100 px-3 py-1.5 rounded-lg border border-red-200" onPress={load}>
                <Text className="text-red-700 font-bold text-[12px]">Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Warning/Status Box */}
          <View className="px-4 pt-5 pb-2">
            {!allOk ? (
              <View className="flex-row items-start gap-4 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm" style={{ elevation: 1 }}>
                <View className="mt-0.5">
                  <MaterialIcons name="error" size={26} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-extrabold uppercase tracking-wide text-red-700 mb-1">Evidencia Incompleta</Text>
                  <Text className="text-red-600 text-[13px] font-medium leading-tight">
                    Debes capturar al menos <Text className="font-bold">1 foto</Text> para poder finalizar la captación y enviarla a Visto Bueno.
                  </Text>
                </View>
              </View>
            ) : (
              <View className="flex-row items-center gap-4 rounded-2xl border border-green-200 bg-green-50 p-4 shadow-sm" style={{ elevation: 1 }}>
                <MaterialIcons name="check-circle" size={28} color="#15803d" />
                <View className="flex-1">
                  <Text className="text-[14px] font-extrabold uppercase tracking-wide text-green-800 mb-0.5">Captación Lista</Text>
                  <Text className="text-green-700 font-medium text-[13px] leading-tight">
                    Ya puedes finalizar la captación. ({fotos.length} foto/s capturadas)
                  </Text>
                </View>
              </View>
            )}

            {me?.rol === "ASESOR" && (
              <TouchableOpacity
                className="mt-4 flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"
                style={{ elevation: 1 }}
                onPress={() => setAutoPre(!autoPre)}
                activeOpacity={0.8}
              >
                <MaterialIcons name={autoPre ? "check-box" : "check-box-outline-blank"} size={26} color={autoPre ? "#1152d4" : "#94a3b8"} />
                <View className="flex-1">
                  <Text className="text-slate-700 text-[14px] font-semibold">Autorizar paso automático</Text>
                  <Text className="text-slate-400 text-[11px] font-bold uppercase tracking-wider mt-0.5">Cambiar a Pre-Siniestro al finalizar</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {PARTES.map((p) => {
            const list = grouped[p] || [];
            const count = list.length;
            const ultimoComentario = list?.[0]?.titulo ? String(list[0].titulo) : "";
            const draft = comentarioPorParte[p] ?? "";

            const canSave = count > 0 && String(draft || "").trim() !== String(ultimoComentario || "").trim() && !savingParte[p];
            const hasPhoto = count > 0;
            const mainPhotoUri = hasPhoto ? `${PUBLIC_URL}${encodeURI(list[0].urlArchivo)}` : null;

            return (
              <View key={p} className="mt-4 px-4">
                <View className="flex-row items-center gap-2 mb-2 px-1">
                  <MaterialIcons name="home-work" size={16} color="#94a3b8" />
                  <Text className="text-[13px] font-bold text-slate-500 uppercase tracking-widest ml-0.5">{prettyParte(p)}</Text>
                </View>

                <View className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 }}>

                  {/* Image Display */}
                  {hasPhoto ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openViewer(p, 0)}
                      className="relative w-full h-48 bg-slate-100 flex items-center justify-center overflow-hidden"
                    >
                      <Image source={{ uri: mainPhotoUri }} className="w-full h-full" resizeMode="cover" />
                      <View className="absolute inset-0 bg-black/10" />

                      <View className="absolute top-3 right-3 bg-white/95 px-3 py-1.5 rounded-full shadow-sm flex-row items-center border border-slate-100">
                        <MaterialIcons name="verified" size={16} color="#10b981" />
                        <Text className="text-emerald-700 font-extrabold ml-1.5 text-[11px] uppercase">{count} archivo(s)</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View className="w-full h-32 bg-slate-50 flex flex-col items-center justify-center border-b border-slate-100">
                      <MaterialIcons name="add-a-photo" size={32} color="#cbd5e1" style={{ marginBottom: 8 }} />
                      <Text className="text-[12px] font-bold text-slate-400">Ninguna fotografía capturada</Text>
                    </View>
                  )}

                  <View className="p-4">
                    <View className="flex-row justify-between items-center bg-slate-50 rounded-xl p-3 mb-4">
                      <View className="flex-1 pr-2">
                        <Text className="text-[14px] font-bold text-slate-900 border-l-2 border-[#1152d4] pl-2 mb-0.5">Capturar {prettyParte(p)}</Text>
                        <Text className="text-slate-500 text-[11px] font-medium leading-tight pl-2" numberOfLines={2}>Toma vistas claras del área requerida.</Text>
                      </View>

                      <View className="flex-row gap-2">
                        {hasPhoto && (
                          <TouchableOpacity
                            className="w-11 h-11 items-center justify-center rounded-xl bg-red-50 border border-red-100"
                            onPress={() => confirmDelete(list[0])}
                            activeOpacity={0.7}
                          >
                            <MaterialIcons name="delete-outline" size={22} color="#dc2626" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          className="flex-row items-center justify-center gap-1.5 rounded-xl h-11 px-4 bg-[#1152d4]"
                          style={{ elevation: 3, shadowColor: '#1152d4', shadowOpacity: 0.25, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } }}
                          activeOpacity={0.85}
                          onPress={() => openCamera(p)}
                        >
                          <MaterialIcons name="camera-alt" size={18} color="white" />
                          <Text className="text-white text-[13px] font-bold">{hasPhoto ? "Añadir +" : "Capturar"}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Thumbnail gallery if multiple photos */}
                    {hasPhoto && count > 1 && (
                      <View className="mt-2 mb-4">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Fotos Adicionales ({count - 1})</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                          {list.slice(1).map((f, idx) => (
                            <View key={f.id} className="relative w-16 h-16 mr-3">
                              <TouchableOpacity
                                onPress={() => openViewer(p, idx + 1)}
                                className="w-full h-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                              >
                                <Image source={{ uri: `${PUBLIC_URL}${encodeURI(f.urlArchivo)}` }} className="w-full h-full opacity-80" resizeMode="cover" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                className="absolute -top-1.5 -right-1.5 bg-red-500 rounded-full w-5 h-5 items-center justify-center border-2 border-white shadow-sm"
                                onPress={() => confirmDelete(f)}
                                style={{ elevation: 2 }}
                              >
                                <MaterialIcons name="close" size={10} color="white" />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    <View className="mt-1">
                      <View className="flex-row items-center mb-2">
                        <MaterialIcons name="notes" size={16} color="#64748b" />
                        <Text className="ml-1 text-[12px] font-bold text-slate-600 uppercase tracking-wider">Comentarios de Inspección</Text>
                      </View>
                      <View className="relative">
                        <TextInput
                          className="w-full rounded-xl border border-slate-200 bg-[#f8fafc] p-4 text-[13px] text-slate-800 pt-4 min-h-[90px]"
                          placeholder={hasPhoto ? "Escribe observaciones detalladas..." : "Sube al menos 1 foto para comentar..."}
                          placeholderTextColor="#94a3b8"
                          multiline
                          textAlignVertical="top"
                          editable={hasPhoto}
                          value={draft}
                          onChangeText={(txt) => setComentarioPorParte((prev) => ({ ...prev, [p]: txt }))}
                        />
                        {canSave && (
                          <TouchableOpacity
                            className="absolute bottom-3 right-3 bg-emerald-100/80 px-4 py-2 rounded-lg flex-row items-center border border-emerald-200 shadow-sm"
                            onPress={() => saveCommentForParte(p)}
                            activeOpacity={0.7}
                            style={{ elevation: 1 }}
                          >
                            {savingParte[p] ? <ActivityIndicator size="small" color="#059669" /> : <MaterialIcons name="save" size={16} color="#059669" />}
                            <Text className="text-emerald-800 font-extrabold text-[12px] ml-1.5">Guardar</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                  </View>
                </View>
              </View>
            );
          })}

          <View className="mt-8 px-4 mb-8">
            <TouchableOpacity
              className="w-full flex-row items-center justify-center gap-3 rounded-2xl h-14 bg-white border border-slate-200 shadow-sm"
              activeOpacity={0.7}
              onPress={() => navigation.navigate("PDFCasoScreen", { casoId })}
              style={{ elevation: 1 }}
            >
              <MaterialIcons name="picture-as-pdf" size={22} color="#475569" />
              <Text className="text-slate-700 font-extrabold text-[14px]">Previsualizar PDF del Caso</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>

        {/* Bottom Action Bar */}
        <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 pt-3 pb-6 z-50 shadow-[0_-8px_10px_-4px_rgb(0,0,0,0.05)]">
          <View className="w-full">
            <TouchableOpacity
              className={`w-full h-[54px] rounded-2xl flex-row items-center justify-center gap-3 shadow-sm ${allOk ? 'bg-[#1152d4]' : 'bg-slate-200'}`}
              disabled={!allOk}
              activeOpacity={0.8}
              style={allOk ? { elevation: 4, shadowColor: '#1152d4', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } } : {}}
              onPress={async () => {
                setError("");
                try {
                  await api.patch(`/casos/${casoId}`, { estado: "PENDIENTE_AUTORIZACION" });

                  if (me?.rol === "ASESOR" && autoPre) {
                    await api.post(`/pre-siniestro/${casoId}/vb-desde-captacion`);
                  }
                  navigation.replace("CasoDetalle", { id: casoId });
                } catch (e) {
                  Alert.alert("Error", e?.response?.data?.message || e?.response?.data?.error || "Error al finalizar captación");
                }
              }}
            >
              <Text className={allOk ? "text-white font-extrabold text-[15px]" : "text-slate-400 font-bold text-[15px]"}>
                Finalizar Captación
              </Text>
              <MaterialIcons name="task-alt" size={20} color={allOk ? "white" : "#94a3b8"} />
            </TouchableOpacity>
            {!allOk && (
              <Text className="text-center text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-bold">
                Completa las fotos obligatorias para finalizar
              </Text>
            )}
          </View>
        </View>

      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}