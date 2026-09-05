import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  Text,
  TouchableOpacity,
  ImageBackground,
  Modal,
  TextInput,
} from "react-native";
import { useSafeScreenInsets } from "../utils/safeArea";
import { useAuth } from "../auth/AuthContext";
import { api, PUBLIC_URL } from "../../api/client";
import { MaterialIcons } from "@expo/vector-icons";
import chileData from "../utils/comunas.json";
import StatusBadge from "../components/ui/StatusBadge";
import SkeletonList from "../components/ui/SkeletonList";

const EmptyListState = ({ refreshing, error, activeTab }) => {
  if (refreshing) return null;
  return (
    <View className="flex-1 justify-center px-4 py-12">
      {error ? (
        <View className="bg-rose-50 border border-rose-200/80 p-5 rounded-2xl mb-4">
          <View className="flex-row items-center gap-2 mb-1">
            <MaterialIcons name="error-outline" size={20} color="#e11d48" />
            <Text className="text-rose-800 font-bold">Error de conexión</Text>
          </View>
          <Text className="text-rose-600 text-xs">{error}</Text>
        </View>
      ) : (
        <View className="bg-white border border-slate-200/70 rounded-3xl p-10 items-center justify-center border-dashed shadow-sm">
          <View className="w-16 h-16 rounded-full bg-slate-50 items-center justify-center mb-3 border border-slate-100">
            <MaterialIcons name="folder-open" size={32} color="#94a3b8" />
          </View>
          <Text className="text-slate-800 font-bold text-base text-center">
            {activeTab === "CAPTACIONES"
              ? "Sin captaciones disponibles"
              : "Sin inspecciones asignadas"}
          </Text>
          <Text className="text-slate-400 text-xs text-center mt-1 max-w-[240px]">
            {activeTab === "CAPTACIONES"
              ? "Crea una nueva captación con el botón flotante inferior."
              : "No tienes inspecciones pendientes en este momento."}
          </Text>
        </View>
      )}
    </View>
  );
};

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60 * 60) return `Hace ${Math.max(1, Math.floor(diff / 60))} min`;
  if (diff < 60 * 60 * 24) return `Hace ${Math.floor(diff / 3600)} h`;
  return date.toLocaleDateString("es-CL");
}

export default function CaptacionesListScreen({ navigation }) {
  const { me, signOut } = useAuth();
  const { top: topPadding, bottom: bottomPadding } = useSafeScreenInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [activeRegion, setActiveRegion] = useState("");
  const [activeComuna, setActiveComuna] = useState("");
  const [searchDireccion, setSearchDireccion] = useState("");
  const [activeTab, setActiveTab] = useState("CAPTACIONES");

  const [modalRegionVisible, setModalRegionVisible] = useState(false);
  const [modalComunaVisible, setModalComunaVisible] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      const params = { page: 1, pageSize: 50 };
      if (activeTab === "CAPTACIONES") {
        params.etapa = "CAPTACION";
      } else {
        params.etapa = "SINIESTRO";
      }
      const res = await api.get("/casos", { params });
      setItems(res.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar casos");
    } finally {
      setLoadingInitial(false);
    }
  }, [activeTab]);

  useEffect(() => {
    if (me?.rol === "INSPECTOR") {
      setActiveTab("INSPECCIONES");
    }
  }, [me]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const regionesDisponibles = useMemo(() => {
    return chileData.regions.map((r) => r.name);
  }, []);

  const comunasDisponibles = useMemo(() => {
    if (!activeRegion) return [];
    const regionObj = chileData.regions.find((r) => r.name === activeRegion);
    return regionObj ? regionObj.communes.map((c) => c.name) : [];
  }, [activeRegion]);

  const filteredItems = useMemo(() => {
    return items.filter((i) => {
      if (activeRegion && i.region?.trim() !== activeRegion) return false;
      if (activeComuna && i.comuna?.trim() !== activeComuna) return false;
      if (searchDireccion) {
        const direccionLower = searchDireccion.toLowerCase();
        const dir = i.direccion?.toLowerCase() || "";
        const nom = i.nombreCliente?.toLowerCase() || "";
        const folio = String(i.folio || "").toLowerCase();
        if (
          !dir.includes(direccionLower) &&
          !nom.includes(direccionLower) &&
          !folio.includes(direccionLower)
        )
          return false;
      }
      return true;
    });
  }, [items, activeRegion, activeComuna, searchDireccion]);

  useEffect(() => {
    if (activeComuna && !comunasDisponibles.includes(activeComuna)) {
      setActiveComuna("");
    }
  }, [comunasDisponibles, activeComuna]);

  const renderItem = ({ item }) => {
    const fotoPrincipal =
      item.fotos?.find((f) => f.parteCasa === "FACHADA") || item.fotos?.[0];

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("CasoDetalle", { id: item.id })}
        activeOpacity={0.7}
        className="bg-white rounded-3xl border border-slate-200/70 overflow-hidden mb-3.5 flex-row min-h-[150px] shadow-sm"
        style={{
          shadowColor: "#0f172a",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}
      >
        {/* Card Image Thumbnail */}
        <View className="w-32 bg-slate-100 relative overflow-hidden flex-shrink-0">
          {fotoPrincipal ? (
            <ImageBackground
              source={{
                uri: `${PUBLIC_URL}${encodeURI(fotoPrincipal.urlArchivo)}`,
              }}
              className="absolute inset-0"
              resizeMode="cover"
            />
          ) : (
            <View className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center">
              <MaterialIcons
                name="image-not-supported"
                size={28}
                color="#cbd5e1"
              />
              <Text className="text-[10px] text-slate-400 mt-1 font-semibold">
                Sin foto
              </Text>
            </View>
          )}

          {/* Photo count floating pill */}
          <View className="absolute top-2.5 left-2.5 rounded-full px-2 py-0.5 bg-black/60 backdrop-blur-md">
            <Text className="text-[10px] font-bold text-white tracking-wider">
              📷 {item.fotos?.length || 0}
            </Text>
          </View>
        </View>

        {/* Card Content */}
        <View className="p-3.5 flex-1 flex-col justify-between">
          <View>
            <View className="flex-row justify-between items-start mb-1.5">
              <View className="flex-1 pr-1">
                <Text className="text-[15px] font-extrabold text-slate-900 tracking-tight">
                  Folio {item.folio ?? "-"}
                </Text>
                <Text className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                  {item.tipo || "CAPTACIÓN"}
                </Text>
              </View>
              <StatusBadge status={item.estado} size="sm" />
            </View>

            {/* Client Info */}
            {(item.nombreCliente || item.rutCliente) && (
              <View className="mb-2 bg-slate-50/80 p-2 rounded-xl border border-slate-100">
                {item.nombreCliente && (
                  <View className="flex-row items-center">
                    <MaterialIcons
                      name="person-outline"
                      size={13}
                      color="#475569"
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      className="text-xs font-bold text-slate-700 flex-1"
                      numberOfLines={1}
                    >
                      {item.nombreCliente}
                    </Text>
                  </View>
                )}
                {item.rutCliente && (
                  <Text className="text-[10px] text-slate-400 font-medium ml-4">
                    RUT {item.rutCliente}
                  </Text>
                )}
              </View>
            )}

            {/* Address */}
            <View className="flex-row items-start bg-amber-50/60 border border-amber-200/50 p-2 rounded-xl mb-1">
              <MaterialIcons
                name="location-on"
                size={14}
                color="#d97706"
                style={{ marginRight: 4, marginTop: 1 }}
              />
              <View className="flex-1">
                <Text
                  className="text-[11px] font-bold text-slate-800 leading-tight"
                  numberOfLines={1}
                >
                  {item.direccion?.trim() || "Dirección no especificada"}
                </Text>
                <Text
                  className="text-[10px] font-semibold text-amber-700 uppercase"
                  numberOfLines={1}
                >
                  {item.comuna?.trim() || "Sin comuna"}{" "}
                  {item.region ? `• ${item.region}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Metadata */}
          <View className="flex-row items-center justify-between pt-2 border-t border-slate-100">
            <View className="flex-row items-center">
              <MaterialIcons
                name="schedule"
                size={12}
                color="#94a3b8"
                style={{ marginRight: 3 }}
              />
              <Text className="text-[10px] text-slate-400 font-medium">
                {formatTimeAgo(item.actualizadoEn || item.creadoEn)}
              </Text>
            </View>

            <View className="flex-row items-center">
              <Text className="text-blue-600 font-bold text-[11px] mr-1">
                Ver detalle
              </Text>
              <MaterialIcons name="chevron-right" size={14} color="#2563eb" />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      {/* Top Header */}
      <View
        style={{
          paddingTop: topPadding,
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#f1f5f9",
          zIndex: 10,
        }}
      >
        <View className="px-5 py-3.5 flex-row items-center justify-between">
          <View className="flex-row items-center gap-2.5">
            <View className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 items-center justify-center">
              <MaterialIcons name="home-work" size={20} color="#2563eb" />
            </View>
            <View>
              <Text className="text-lg font-black text-slate-900 tracking-tight">
                ASESUR
              </Text>
              <Text className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                {activeTab === "CAPTACIONES" ? "Captaciones" : "Inspecciones"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={onRefresh}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/60 items-center justify-center"
            >
              <MaterialIcons name="refresh" size={18} color="#64748b" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={signOut}
              activeOpacity={0.7}
              className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200/60 items-center justify-center"
            >
              <MaterialIcons name="logout" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Selector Pills */}
        <View className="flex-row px-4 pb-3 gap-2">
          <TouchableOpacity
            onPress={() => setActiveTab("CAPTACIONES")}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              backgroundColor: activeTab === "CAPTACIONES" ? "#2563eb" : "#f1f5f9",
              borderColor: activeTab === "CAPTACIONES" ? "#2563eb" : "#e2e8f0",
            }}
          >
            <MaterialIcons
              name="assignment"
              size={16}
              color={activeTab === "CAPTACIONES" ? "#ffffff" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: activeTab === "CAPTACIONES" ? "#ffffff" : "#475569",
              }}
            >
              Captaciones
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("INSPECCIONES")}
            activeOpacity={0.7}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              backgroundColor: activeTab === "INSPECCIONES" ? "#2563eb" : "#f1f5f9",
              borderColor: activeTab === "INSPECCIONES" ? "#2563eb" : "#e2e8f0",
            }}
          >
            <MaterialIcons
              name="engineering"
              size={16}
              color={activeTab === "INSPECCIONES" ? "#ffffff" : "#64748b"}
              style={{ marginRight: 6 }}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color: activeTab === "INSPECCIONES" ? "#ffffff" : "#475569",
              }}
            >
              Inspecciones
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter & Search Bar */}
      <View className="px-4 pt-3 pb-1">
        {/* Region / Comuna Pills */}
        <View className="flex-row gap-2 mb-2">
          <TouchableOpacity
            className="flex-1 px-3.5 h-9 rounded-xl bg-white border border-slate-200/80 flex-row items-center justify-between shadow-sm"
            activeOpacity={0.7}
            onPress={() => setModalRegionVisible(true)}
          >
            <Text
              className={`text-xs font-bold ${
                activeRegion ? "text-blue-600" : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {activeRegion ? activeRegion : "Región: Todas"}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={16}
              color="#94a3b8"
            />
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 px-3.5 h-9 rounded-xl flex-row items-center justify-between border shadow-sm ${
              !activeRegion
                ? "bg-slate-100 border-slate-200 opacity-60"
                : "bg-white border-slate-200/80"
            }`}
            activeOpacity={0.7}
            onPress={() => {
              if (activeRegion) setModalComunaVisible(true);
            }}
            disabled={!activeRegion}
          >
            <Text
              className={`text-xs font-bold ${
                activeComuna ? "text-blue-600" : "text-slate-600"
              }`}
              numberOfLines={1}
            >
              {activeComuna ? activeComuna : "Comuna: Todas"}
            </Text>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={16}
              color="#94a3b8"
            />
          </TouchableOpacity>
        </View>

        {/* Clear filter chip */}
        {(activeRegion || activeComuna) && (
          <TouchableOpacity
            className="self-start mb-2 bg-slate-200/70 rounded-full px-2.5 py-0.5 flex-row items-center"
            onPress={() => {
              setActiveRegion("");
              setActiveComuna("");
            }}
          >
            <Text className="text-[10px] font-bold text-slate-600 mr-1">
              Limpiar filtros
            </Text>
            <MaterialIcons name="close" size={12} color="#475569" />
          </TouchableOpacity>
        )}

        {/* Search Input */}
        <View className="bg-white rounded-2xl border border-slate-200/80 flex-row items-center px-3.5 h-10 shadow-sm">
          <MaterialIcons name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-slate-800 text-xs h-full"
            placeholder="Buscar por dirección, folio o cliente..."
            placeholderTextColor="#94a3b8"
            value={searchDireccion}
            onChangeText={setSearchDireccion}
            autoCorrect={false}
          />
          {searchDireccion !== "" && (
            <TouchableOpacity
              onPress={() => setSearchDireccion("")}
              className="p-1"
            >
              <MaterialIcons name="close" size={14} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Results Header */}
        <View className="flex-row items-center justify-between pt-3 pb-1">
          <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {activeRegion || activeComuna || searchDireccion
              ? "Resultados"
              : "Casos Registrados"}
          </Text>
          <View className="bg-slate-200/70 rounded-full px-2 py-0.5">
            <Text className="text-[10px] font-extrabold text-slate-600">
              {filteredItems.length} {filteredItems.length === 1 ? "caso" : "casos"}
            </Text>
          </View>
        </View>
      </View>

      {/* List or Skeleton */}
      {loadingInitial && !refreshing ? (
        <SkeletonList count={4} />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#2563eb"]}
              tintColor="#2563eb"
            />
          }
          contentContainerStyle={{
            padding: 16,
            paddingTop: 4,
            paddingBottom: Math.max(110, bottomPadding + 95),
            flexGrow: 1,
          }}
          ListEmptyComponent={
            <EmptyListState
              refreshing={refreshing}
              error={error}
              activeTab={activeTab}
            />
          }
          renderItem={renderItem}
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute w-14 h-14 bg-blue-600 rounded-full items-center justify-center shadow-xl"
        activeOpacity={0.7}
        style={{
          bottom: Math.max(28, bottomPadding + 20),
          right: 20,
          elevation: 6,
          shadowColor: "#2563eb",
          shadowOpacity: 0.4,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
        }}
        onPress={() => navigation.navigate("NuevaCaptacion")}
      >
        <MaterialIcons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      {/* MODAL REGIÓN */}
      <Modal
        visible={modalRegionVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalRegionVisible(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
        >
          <View className="bg-white rounded-t-3xl min-h-[50%] max-h-[80%] pb-8">
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-900">
                Seleccionar Región
              </Text>
              <TouchableOpacity
                onPress={() => setModalRegionVisible(false)}
                className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
              >
                <MaterialIcons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { id: "TODOS", name: "Todas las Regiones" },
                ...regionesDisponibles.map((r) => ({ id: r, name: r })),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
              renderItem={({ item }) => {
                const isActive =
                  item.id === "TODOS"
                    ? activeRegion === ""
                    : activeRegion === item.name;
                return (
                  <TouchableOpacity
                    className={`py-3.5 px-4 border-b border-slate-50 flex-row justify-between items-center ${
                      isActive ? "bg-blue-50/70 rounded-2xl border-b-0" : ""
                    }`}
                    onPress={() => {
                      if (item.id === "TODOS") {
                        setActiveRegion("");
                        setActiveComuna("");
                      } else {
                        setActiveRegion(item.name);
                        setActiveComuna("");
                      }
                      setModalRegionVisible(false);
                    }}
                  >
                    <Text
                      className={`text-sm ${
                        isActive
                          ? "font-bold text-blue-600"
                          : "text-slate-700 font-medium"
                      }`}
                    >
                      {item.name}
                    </Text>
                    {isActive && (
                      <MaterialIcons name="check" size={18} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL COMUNA */}
      <Modal
        visible={modalComunaVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalComunaVisible(false)}
      >
        <View
          className="flex-1 justify-end"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
        >
          <View className="bg-white rounded-t-3xl min-h-[50%] max-h-[80%] pb-8">
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
              <Text className="text-base font-bold text-slate-900">
                Seleccionar Comuna
              </Text>
              <TouchableOpacity
                onPress={() => setModalComunaVisible(false)}
                className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center"
              >
                <MaterialIcons name="close" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[
                { id: "TODOS", name: "Todas las Comunas" },
                ...comunasDisponibles.map((c) => ({ id: c, name: c })),
              ]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingVertical: 8,
              }}
              renderItem={({ item }) => {
                const isActive =
                  item.id === "TODOS"
                    ? activeComuna === ""
                    : activeComuna === item.name;
                return (
                  <TouchableOpacity
                    className={`py-3.5 px-4 border-b border-slate-50 flex-row justify-between items-center ${
                      isActive ? "bg-blue-50/70 rounded-2xl border-b-0" : ""
                    }`}
                    onPress={() => {
                      if (item.id === "TODOS") {
                        setActiveComuna("");
                      } else {
                        setActiveComuna(item.name);
                      }
                      setModalComunaVisible(false);
                    }}
                  >
                    <Text
                      className={`text-sm ${
                        isActive
                          ? "font-bold text-blue-600"
                          : "text-slate-700 font-medium"
                      }`}
                    >
                      {item.name}
                    </Text>
                    {isActive && (
                      <MaterialIcons name="check" size={18} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
