import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  ScrollView,
  View,
  Alert,
  AppState,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Text,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import ImageViewing from "react-native-image-viewing";
import { useSafeScreenInsets } from "../utils/safeArea";
import { api, PUBLIC_URL } from "../../api/client";
import { useAuth } from "../auth/AuthContext";
import ModernHeader from "../components/ui/ModernHeader";
import ModernCard from "../components/ui/ModernCard";
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
  const { bottom: bottomPadding } = useSafeScreenInsets();
  const [autoPre, setAutoPre] = useState(false);

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [fotos, setFotos] = useState([]);
  const [caso, setCaso] = useState(null);

  const [comentarioPorParte, setComentarioPorParte] = useState({});
  const [savingParte, setSavingParte] = useState({});

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [viewerImages, setViewerImages] = useState([]);

  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const [resFotos, resCaso] = await Promise.all([
        api.get(`/casos/${casoId}/fotos`),
        api.get(`/casos/${casoId}`),
      ]);
      const list = resFotos.data?.fotos || [];
      setFotos(list);
      setCaso(resCaso?.data?.caso || resCaso?.data || null);

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
      setError(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se pudieron cargar las fotos"
      );
    } finally {
      setBusy(false);
    }
  }, [casoId]);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });

    const unsub = navigation.addListener("focus", async () => {
      try {
        await processQueue();
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

  const allOk = fotos.length >= 1;

  const pendingInspectionGestion = useMemo(() => {
    if (!caso || !caso.gestiones) return null;
    return caso.gestiones.find(
      (g) => g.tipo === "INSPECCION" && g.estado !== "COMPLETADA"
    );
  }, [caso]);

  const esInspeccion = useMemo(() => {
    return !!pendingInspectionGestion || caso?.estado === "INSPECCION";
  }, [pendingInspectionGestion, caso]);

  const canAutoPre = useMemo(() => {
    return (
      me?.rol === "ASESOR" ||
      me?.rol === "GERENTE" ||
      me?.rol === "SUPERADMIN" ||
      me?.rol === "MASTER"
    );
  }, [me]);

  const openCamera = (parteCasa) => {
    navigation.navigate("TomarFoto", { casoId, parteCasa });
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

    if (
      rol === "SUPERADMIN" ||
      rol === "OPERACIONES" ||
      rol === "GERENTE" ||
      rol === "MASTER"
    )
      return true;

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
                e?.response?.data?.message || "No se pudo eliminar la foto"
              );
            }
          },
        },
      ]
    );
  };

  const saveCommentForParte = async (parteCasa) => {
    const list = grouped[parteCasa] || [];
    const latest = list?.[0];
    if (!latest?.id) return;

    const draft = String(comentarioPorParte[parteCasa] || "").trim();
    setSavingParte((prev) => ({ ...prev, [parteCasa]: true }));
    try {
      await api.patch(`/casos/${casoId}/fotos/${latest.id}`, {
        titulo: draft || null,
      });
      await load();
      Alert.alert("Éxito", "Comentario guardado exitosamente");
    } catch (e) {
      Alert.alert(
        "Error",
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se pudo guardar el comentario"
      );
    } finally {
      setSavingParte((prev) => ({ ...prev, [parteCasa]: false }));
    }
  };

  if (busy) {
    return (
      <View className="flex-1 items-center justify-center bg-[#f8fafc]">
        <ActivityIndicator size="large" color="#2563eb" />
        <Text className="text-slate-400 font-bold text-xs mt-3">
          Cargando evidencia fotográfica...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <ImageViewing
        images={viewerImages}
        imageIndex={viewerIndex}
        visible={viewerOpen}
        onRequestClose={() => setViewerOpen(false)}
        swipeToCloseEnabled
        doubleTapToZoomEnabled
      />

      <View className="flex-1 bg-[#f8fafc]">
        {/* Modern Header */}
        <ModernHeader
          title={esInspeccion ? "Fotos de Inspección" : "Fotos de Captación"}
          subtitle={`Folio ${caso?.folio || "-"}`}
          onBack={() => navigation.goBack()}
          rightElement={
            <View className="bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              <Text className="text-blue-700 text-xs font-black">
                {fotos.length} fotos
              </Text>
            </View>
          }
        />

        <ScrollView
          contentContainerStyle={{ paddingBottom: bottomPadding + 110 }}
          showsVerticalScrollIndicator={false}
        >
          {!!error && (
            <View className="m-4 bg-rose-50 p-4 rounded-2xl border border-rose-200 flex-row items-center">
              <MaterialIcons name="error-outline" size={20} color="#dc2626" />
              <View className="flex-1 ml-2.5">
                <Text className="text-rose-700 font-bold text-xs">{error}</Text>
              </View>
              <TouchableOpacity
                className="bg-rose-100 px-3 py-1.5 rounded-xl border border-rose-200"
                activeOpacity={0.7}
                onPress={load}
              >
                <Text className="text-rose-700 font-bold text-[11px]">
                  Reintentar
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Warning / Ready Banner */}
          {!esInspeccion && (
            <View className="px-4 pt-4 pb-1">
              {!allOk ? (
                <View className="flex-row items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 shadow-sm">
                  <MaterialIcons name="info-outline" size={24} color="#d97706" />
                  <View className="flex-1">
                    <Text className="text-xs font-extrabold uppercase tracking-wide text-amber-900">
                      Evidencia en progreso
                    </Text>
                    <Text className="text-amber-700 text-xs font-medium mt-0.5">
                      Captura al menos 1 foto para poder finalizar la captación.
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="flex-row items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-3.5 shadow-sm">
                  <MaterialIcons
                    name="check-circle"
                    size={24}
                    color="#059669"
                  />
                  <View className="flex-1">
                    <Text className="text-xs font-extrabold uppercase tracking-wide text-emerald-900">
                      Evidencia lista
                    </Text>
                    <Text className="text-emerald-700 text-xs font-medium mt-0.5">
                      {fotos.length} fotos tomadas. Ya puedes finalizar.
                    </Text>
                  </View>
                </View>
              )}

              {canAutoPre && (
                <TouchableOpacity
                  className="mt-3 flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm"
                  activeOpacity={0.7}
                  onPress={() => setAutoPre(!autoPre)}
                >
                  <MaterialIcons
                    name={autoPre ? "check-box" : "check-box-outline-blank"}
                    size={22}
                    color={autoPre ? "#2563eb" : "#94a3b8"}
                  />
                  <View className="flex-1">
                    <Text className="text-slate-800 text-xs font-bold">
                      Autorizar paso automático
                    </Text>
                    <Text className="text-slate-400 text-[10px] font-medium">
                      Cambiar a Pre-Siniestro inmediatamente
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Partes List */}
          {PARTES.map((p) => {
            const list = grouped[p] || [];
            const count = list.length;
            const ultimoComentario = list?.[0]?.titulo
              ? String(list[0].titulo)
              : "";
            const draft = comentarioPorParte[p] ?? "";

            const canSave =
              count > 0 &&
              String(draft || "").trim() !== String(ultimoComentario || "").trim() &&
              !savingParte[p];
            const hasPhoto = count > 0;
            const mainPhotoUri = hasPhoto
              ? `${PUBLIC_URL}${encodeURI(list[0].urlArchivo)}`
              : null;

            return (
              <View key={p} className="mt-3.5 px-4">
                <ModernCard className="overflow-hidden p-0">
                  {/* Photo Main Area */}
                  {hasPhoto ? (
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPress={() => openViewer(p, 0)}
                      className="relative w-full h-44 bg-slate-100 flex items-center justify-center overflow-hidden"
                    >
                      <Image
                        source={{ uri: mainPhotoUri }}
                        className="w-full h-full"
                        resizeMode="cover"
                      />
                      <View className="absolute inset-0 bg-black/10" />

                      <View className="absolute top-3 right-3 bg-white/95 px-2.5 py-1 rounded-full shadow-sm flex-row items-center border border-slate-100">
                        <MaterialIcons
                          name="check-circle"
                          size={14}
                          color="#059669"
                        />
                        <Text className="text-emerald-800 font-extrabold ml-1 text-[11px]">
                          {count} {count === 1 ? "foto" : "fotos"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View className="w-full h-24 bg-slate-50 flex flex-col items-center justify-center border-b border-slate-100">
                      <MaterialIcons
                        name="add-a-photo"
                        size={26}
                        color="#cbd5e1"
                      />
                      <Text className="text-[11px] font-bold text-slate-400 mt-1">
                        Sin fotografías registradas
                      </Text>
                    </View>
                  )}

                  <View className="p-3.5">
                    {/* Header of the Part */}
                    <View className="flex-row justify-between items-center bg-slate-50/80 rounded-xl p-3 mb-3 border border-slate-100">
                      <View className="flex-1 pr-2">
                        <Text className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          {prettyParte(p)}
                        </Text>
                        <Text
                          className="text-slate-400 text-[10px] font-medium"
                          numberOfLines={1}
                        >
                          {hasPhoto
                            ? "Área registrada"
                            : "Captura vistas del área"}
                        </Text>
                      </View>

                      <View className="flex-row gap-2">
                        {hasPhoto && (
                          <TouchableOpacity
                            className="w-9 h-9 items-center justify-center rounded-xl bg-rose-50 border border-rose-100"
                            activeOpacity={0.7}
                            onPress={() => confirmDelete(list[0])}
                          >
                            <MaterialIcons
                              name="delete-outline"
                              size={18}
                              color="#e11d48"
                            />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          className="flex-row items-center justify-center gap-1 rounded-xl h-9 px-3 bg-blue-600 shadow-sm"
                          activeOpacity={0.7}
                          onPress={() => openCamera(p)}
                        >
                          <MaterialIcons
                            name="camera-alt"
                            size={16}
                            color="white"
                          />
                          <Text className="text-white text-xs font-bold">
                            {hasPhoto ? "Añadir +" : "Capturar"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Additional photo thumbnails */}
                    {hasPhoto && count > 1 && (
                      <View className="mb-3">
                        <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                          Fotos Adicionales ({count - 1})
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          className="flex-row"
                        >
                          {list.slice(1).map((f, idx) => (
                            <View key={f.id} className="relative w-14 h-14 mr-2">
                              <TouchableOpacity
                                onPress={() => openViewer(p, idx + 1)}
                                className="w-full h-full rounded-xl border border-slate-200 overflow-hidden bg-slate-50"
                              >
                                <Image
                                  source={{
                                    uri: `${PUBLIC_URL}${encodeURI(
                                      f.urlArchivo
                                    )}`,
                                  }}
                                  className="w-full h-full"
                                  resizeMode="cover"
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                className="absolute -top-1 -right-1 bg-rose-500 rounded-full w-5 h-5 items-center justify-center border border-white shadow-sm"
                                onPress={() => confirmDelete(f)}
                              >
                                <MaterialIcons
                                  name="close"
                                  size={11}
                                  color="white"
                                />
                              </TouchableOpacity>
                            </View>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                    {/* Observations Input */}
                    <View>
                      <View className="flex-row items-center mb-1.5">
                        <MaterialIcons name="edit-note" size={16} color="#64748b" />
                        <Text className="ml-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          Observaciones
                        </Text>
                      </View>
                      <View className="relative">
                        <TextInput
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs text-slate-800 min-h-[75px]"
                          placeholder={
                            hasPhoto
                              ? "Escribe observaciones del área..."
                              : "Toma una foto para agregar comentarios..."
                          }
                          placeholderTextColor="#94a3b8"
                          multiline
                          textAlignVertical="top"
                          editable={hasPhoto}
                          value={draft}
                          onChangeText={(txt) =>
                            setComentarioPorParte((prev) => ({
                              ...prev,
                              [p]: txt,
                            }))
                          }
                        />
                        {canSave && (
                          <TouchableOpacity
                            className="absolute bottom-2.5 right-2.5 bg-emerald-600 px-3 py-1.5 rounded-lg flex-row items-center shadow-sm"
                            activeOpacity={0.7}
                            onPress={() => saveCommentForParte(p)}
                          >
                            {savingParte[p] ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <MaterialIcons
                                name="check"
                                size={14}
                                color="#ffffff"
                              />
                            )}
                            <Text className="text-white font-bold text-xs ml-1">
                              Guardar
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                </ModernCard>
              </View>
            );
          })}
        </ScrollView>

        {/* Bottom Floating Bar */}
        <View
          className="absolute bottom-0 left-0 right-0 bg-white border-t border-slate-200/80 px-4 pt-3 z-50 shadow-xl"
          style={{ paddingBottom: Math.max(bottomPadding, 16) }}
        >
          <TouchableOpacity
            className={`w-full h-12 rounded-2xl flex-row items-center justify-center gap-2 shadow-md ${
              allOk || esInspeccion ? "bg-blue-600" : "bg-slate-200"
            }`}
            activeOpacity={0.7}
            disabled={!allOk && !esInspeccion}
            onPress={async () => {
              setError("");
              if (esInspeccion) {
                Alert.alert(
                  "Terminar Inspección",
                  "¿Estás seguro de que deseas finalizar la inspección de este caso? Se registrarán las fotos y el estado de la inspección.",
                  [
                    { text: "Cancelar", style: "cancel" },
                    {
                      text: "Finalizar",
                      style: "default",
                      onPress: async () => {
                        try {
                          if (pendingInspectionGestion) {
                            await api.post(
                              `/siniestros/${casoId}/gestiones/${pendingInspectionGestion.id}/completar`,
                              {
                                observaciones:
                                  "Inspección completada desde aplicación móvil",
                              }
                            );
                          } else {
                            await api.patch(`/casos/${casoId}`, {
                              estado: "INSPECCION",
                            });
                          }
                          Alert.alert(
                            "Éxito",
                            "La inspección ha sido finalizada correctamente."
                          );
                          navigation.replace("CasoDetalle", { id: casoId });
                        } catch (e) {
                          Alert.alert(
                            "Error",
                            e?.response?.data?.error ||
                            e?.response?.data?.message ||
                            "No se pudo completar la inspección."
                          );
                        }
                      },
                    },
                  ]
                );
              } else {
                try {
                  await api.patch(`/casos/${casoId}`, {
                    estado: "PENDIENTE_AUTORIZACION",
                  });

                  if (canAutoPre && autoPre) {
                    await api.post(`/captaciones/${casoId}/vb-pre`);
                  }
                  navigation.replace("CasoDetalle", { id: casoId });
                } catch (e) {
                  Alert.alert(
                    "Error",
                    e?.response?.data?.message ||
                    e?.response?.data?.error ||
                    "Error al finalizar captación"
                  );
                }
              }
            }}
          >
            <Text
              className="text-base font-extrabold uppercase"
              style={{ color: allOk || esInspeccion ? "#ffffff" : "#94a3b8" }}
            >
              {esInspeccion ? "Finalizar inspección" : "Finalizar captación"}
            </Text>
            <MaterialIcons
              name="check"
              size={20}
              color={allOk || esInspeccion ? "#ffffff" : "#031c40ff"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}