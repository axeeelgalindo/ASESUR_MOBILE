import React, { useCallback, useEffect, useState, useMemo } from "react";
import { FlatList, RefreshControl, View, Text, TouchableOpacity, ImageBackground, ActivityIndicator, Modal, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { api, PUBLIC_URL } from "../../api/client";
import { MaterialIcons } from '@expo/vector-icons';
import chileData from "../utils/comunas.json";

const EmptyListState = ({ refreshing, error, activeTab }) => {
  if (refreshing) return null;
  return (
    <View className="flex-1 justify-center px-4 py-8">
      {error ? (
        <View className="bg-red-50 border border-red-200 p-4 rounded-xl mb-4 mt-2">
          <Text className="text-red-600 font-semibold">{error}</Text>
        </View>
      ) : (
        <View className="bg-white border border-slate-200 rounded-2xl p-8 items-center justify-center mt-2 border-dashed">
          <MaterialIcons name="folder-open" size={48} color="#cbd5e1" />
          <Text className="text-slate-500 text-center font-medium mt-3">
            {activeTab === "CAPTACIONES"
              ? "No hay captaciones registradas en esta categoría."
              : "No tienes inspecciones pendientes asignadas."}
          </Text>
        </View>
      )}
    </View>
  );
};

// Formato de fechas amigable (ej: "Actualizado hace 15 minutos" aproxima a string)
function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const diff = Math.floor((new Date() - date) / 1000);
  if (diff < 60 * 60) return `Actualizado hace ${Math.floor(diff / 60)} min`;
  if (diff < 60 * 60 * 24) return `Actualizado hace ${Math.floor(diff / 3600)} horas`;
  return `Actualizado el ${date.toLocaleDateString("es-CL")}`;
}

const getEstadoStyle = (estado) => {
  if (estado === "ABIERTO") return "bg-green-100 text-green-700 border-green-200";
  if (estado === "CERRADO") return "bg-slate-100 text-slate-600 border-slate-200";
  return "bg-blue-100 text-blue-700 border-blue-200";
};

export default function CaptacionesListScreen({ navigation }) {
  const { me, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
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
        params.estado = "INSPECCION";
      }
      const res = await api.get("/casos", { params });
      setItems(res.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar casos");
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

  // 1. Obtener lista estática de regiones desde el JSON
  const regionesDisponibles = useMemo(() => {
    return chileData.regions.map(r => r.name);
  }, []);

  // 2. Obtener lista estática de comunas según la región seleccionada desde el JSON
  const comunasDisponibles = useMemo(() => {
    if (!activeRegion) return [];
    const regionObj = chileData.regions.find(r => r.name === activeRegion);
    return regionObj ? regionObj.communes.map(c => c.name) : [];
  }, [activeRegion]);

  // 3. Aplicar filtro triple localmente (Región, Comuna, Dirección)
  const filteredItems = useMemo(() => {
    return items.filter(i => {
      if (activeRegion && i.region?.trim() !== activeRegion) return false;
      if (activeComuna && i.comuna?.trim() !== activeComuna) return false;
      if (searchDireccion) {
        const direccionLower = searchDireccion.toLowerCase();
        const dir = i.direccion?.toLowerCase() || "";
        const nom = i.nombreCliente?.toLowerCase() || "";
        if (!dir.includes(direccionLower) && !nom.includes(direccionLower)) return false;
      }
      return true;
    });
  }, [items, activeRegion, activeComuna, searchDireccion]);

  // 4. Limpieza de comunas si se cambia la región
  useEffect(() => {
    if (activeComuna && !comunasDisponibles.includes(activeComuna)) {
      setActiveComuna("");
    }
  }, [comunasDisponibles, activeComuna]);

  const renderItem = ({ item }) => {
    const estadoClass = getEstadoStyle(item.estado);
    const fotoPrincipal = item.fotos?.find(f => f.parteCasa === "FACHADA") || item.fotos?.[0];

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => navigation.navigate("CasoDetalle", { id: item.id })}
        className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4 flex-row min-h-[160px]"
        style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 }}
      >
        {/* Card Image Area (Miniatura Izquierda) */}
        <View className="w-32 bg-slate-100 relative overflow-hidden flex-shrink-0">
          {fotoPrincipal ? (
            <ImageBackground
              source={{ uri: `${PUBLIC_URL}${encodeURI(fotoPrincipal.urlArchivo)}` }}
              className="absolute inset-0"
              resizeMode="cover"
            />
          ) : (
            <View className="absolute inset-0 bg-slate-200 flex flex-col items-center justify-center">
              <MaterialIcons name="image-not-supported" size={32} color="#94a3b8" />
              <Text className="text-[10px] text-slate-400 mt-1 font-medium">Sin foto</Text>
            </View>
          )}
          <View className="absolute top-2 left-2 rounded-md border border-slate-200 px-2 py-1" style={{ backgroundColor: "rgba(255,255,255,0.95)" }}>
            <Text className="text-[9px] font-bold text-slate-700 tracking-widest uppercase">
              {item.fotos?.length || 0} Fotos
            </Text>
          </View>
        </View>

        {/* Card Content Area (Derecha) */}
        <View className="p-4 flex-1 flex-col justify-between">
          <View>
            <View className="flex-row justify-between items-start mb-2">
              <View className="flex-1 pr-2">
                <Text className="text-[15px] font-bold text-slate-900 leading-tight">Folio {item.folio ?? "-"}</Text>
                <Text className="text-[11px] font-semibold text-[#1152d4] uppercase tracking-wider mt-0.5">{item.tipo}</Text>
              </View>
              <View className={`px-2 py-1 rounded border ${estadoClass.split(' ').filter(c => c.startsWith('bg-') || c.startsWith('border-')).join(' ')}`}>
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${estadoClass.split(' ').find(c => c.startsWith('text-'))}`}>{item.estado}</Text>
              </View>
            </View>

            {/* Información del Cliente */}
            {(item.nombreCliente || item.rutCliente) && (
              <View className="mb-3 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {item.nombreCliente && (
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name="person-outline" size={14} color="#64748b" />
                    <Text className="text-[12px] font-bold text-slate-700 flex-1 leading-tight" numberOfLines={1}>{item.nombreCliente}</Text>
                  </View>
                )}
                {item.rutCliente && (
                  <View className="flex-row items-center gap-1.5">
                    <MaterialIcons name="badge" size={14} color="#94a3b8" />
                    <Text className="text-[11px] text-slate-500 font-medium">RUT {item.rutCliente}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Dirección Destacada */}
            <View className="p-2.5 rounded-lg border flex-row items-start gap-1.5 mb-2" style={{ backgroundColor: "rgba(254, 252, 232, 0.8)", borderColor: "rgba(253, 230, 138, 0.8)" }}>
              <View className="mt-0.5">
                <MaterialIcons name="location-on" size={16} color="#d97706" />
              </View>
              <View className="flex-1">
                <Text className="text-[12px] font-bold text-slate-800 leading-tight mb-0.5" numberOfLines={2}>
                  {item.direccion?.trim() || "Dirección no especificada"}
                </Text>
                <Text className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "rgba(180, 83, 9, 0.8)" }} numberOfLines={1}>
                  {item.comuna?.trim() || "Sin comuna"} {item.region ? `• ${item.region}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {/* Footer Metadata */}
          <View className="flex-row items-center justify-between pt-3 border-t border-slate-100 mt-auto">
            <View className="flex-row items-center gap-1">
              <MaterialIcons name="update" size={14} color="#94a3b8" />
              <Text className="text-[10px] text-slate-500 font-medium mt-0.5">
                {formatTimeAgo(item.actualizadoEn)}
              </Text>
            </View>
            <View className="px-2 py-1 rounded flex-row items-center gap-1" style={{ backgroundColor: "rgba(17, 82, 212, 0.1)" }}>
              <MaterialIcons name="open-in-new" size={12} color="#1152d4" />
              <Text className="text-[#1152d4] font-bold text-[10px] uppercase tracking-wider">Detalles</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f6f6f8]">
      {/* Header Fijo Original */}
      <View className="bg-white border-b border-slate-200 px-4 py-3 flex-row items-center justify-between z-10">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="p-1.5 rounded-full flex items-center justify-center"
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <MaterialIcons name="sync" size={22} color="#64748b" />
          </TouchableOpacity>
          <Text className="text-lg font-bold tracking-tight text-slate-900">
            {activeTab === "CAPTACIONES" ? "Captaciones" : "Inspecciones"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="p-1.5 rounded-full flex items-center justify-center"
            onPress={signOut}
            activeOpacity={0.7}
          >
            <MaterialIcons name="logout" size={22} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Selector de Pestañas (Captaciones / Inspecciones) */}
      <View className="flex-row bg-white border-b border-slate-200">
        <TouchableOpacity
          onPress={() => setActiveTab("CAPTACIONES")}
          className={`flex-1 py-3 items-center border-b-2 ${activeTab === "CAPTACIONES" ? "border-blue-600" : "border-transparent"}`}
        >
          <View className="flex-row items-center gap-1.5">
            <MaterialIcons name="assignment" size={18} color={activeTab === "CAPTACIONES" ? "#2563eb" : "#64748b"} />
            <Text className={`text-sm ${activeTab === "CAPTACIONES" ? "text-blue-600 font-bold" : "text-slate-500 font-semibold"}`}>
              Captaciones
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setActiveTab("INSPECCIONES")}
          className={`flex-1 py-3 items-center border-b-2 ${activeTab === "INSPECCIONES" ? "border-blue-600" : "border-transparent"}`}
        >
          <View className="flex-row items-center gap-1.5">
            <MaterialIcons name="engineering" size={18} color={activeTab === "INSPECCIONES" ? "#2563eb" : "#64748b"} />
            <Text className={`text-sm ${activeTab === "INSPECCIONES" ? "text-blue-600 font-bold" : "text-slate-500 font-semibold"}`}>
              Inspecciones
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Header del Contenido de Lista (Filtros) */}
      <View className="bg-[#f6f6f8] px-4 pt-4 pb-2">
        <View className="flex-row gap-2 pb-2 z-10">
          <TouchableOpacity
            className="flex-1 px-4 h-10 rounded-full bg-white border border-slate-200 flex-row items-center justify-between"
            onPress={() => setModalRegionVisible(true)}
            activeOpacity={0.7}
            style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }}
          >
            <Text className={`text-[12px] ${activeRegion ? "text-[#1152d4] font-bold" : "text-slate-500 font-semibold"}`} numberOfLines={1}>
              {activeRegion ? activeRegion : "Todas las Regiones"}
            </Text>
            <MaterialIcons name="expand-more" size={16} color={activeRegion ? "#1152d4" : "#94a3b8"} />
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 px-4 h-10 rounded-full flex-row items-center justify-between border ${!activeRegion ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200'}`}
            onPress={() => {
              // Permitir presionar solo si hay región
              if (activeRegion) setModalComunaVisible(true);
            }}
            activeOpacity={0.7}
            style={
              activeRegion
                ? { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 }
                : { opacity: 0.6 }
            }
            disabled={!activeRegion}
          >
            <Text className={`text-[12px] ${activeComuna ? "text-[#1152d4] font-bold" : "text-slate-500 font-semibold"}`} numberOfLines={1}>
              {activeComuna ? activeComuna : "Todas las Comunas"}
            </Text>
            <MaterialIcons name="expand-more" size={16} color={activeComuna ? "#1152d4" : "#94a3b8"} />
          </TouchableOpacity>
        </View>

        {(activeRegion || activeComuna) && (
          <TouchableOpacity
            className="items-start mb-2 ml-1"
            onPress={() => { setActiveRegion(""); setActiveComuna(""); }}
          >
            <Text className="text-[11px] font-bold text-slate-400 bg-slate-200 rounded-lg px-2 py-1">Limpiar filtros ✕</Text>
          </TouchableOpacity>
        )}

        {/* Input de búsqueda por dirección */}
        <View className="mb-2 bg-white rounded-xl border border-slate-200 flex-row items-center px-3 h-10 shadow-sm" style={{ shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1 }}>
          <MaterialIcons name="search" size={18} color="#94a3b8" />
          <TextInput
            className="flex-1 ml-2 text-slate-700 text-[13px] h-full"
            placeholder="Buscar por dirección o cliente..."
            placeholderTextColor="#94a3b8"
            value={searchDireccion}
            onChangeText={setSearchDireccion}
            autoCorrect={false}
          />
          {searchDireccion !== "" && (
            <TouchableOpacity onPress={() => setSearchDireccion("")} className="p-1">
              <MaterialIcons name="close" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Section Title */}
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-sm font-semibold uppercase tracking-wider text-slate-500">
            {(!activeRegion && !activeComuna) ? "Recientes" : "Resultados de búsqueda"}
          </Text>
          <View className="px-2.5 py-1 rounded-full" style={{ backgroundColor: "rgba(226, 232, 240, 0.5)" }}>
            <Text className="text-[11px] font-bold text-slate-500">{filteredItems.length} casos</Text>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16, paddingTop: 8, paddingBottom: 80, flexGrow: 1 }}
        ListEmptyComponent={<EmptyListState refreshing={refreshing} error={error} activeTab={activeTab} />}
        renderItem={renderItem}
      />

      {/* Floating Action Button (FAB) para Nueva Captación */}
      <TouchableOpacity
        className="absolute bottom-6 right-6 w-[60px] h-[60px] bg-[#1152d4] rounded-full items-center justify-center shadow-lg"
        style={{ elevation: 5, shadowColor: '#1152d4', shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 6 } }}
        activeOpacity={0.8}
        onPress={() => navigation.navigate("NuevaCaptacion")}
      >
        <MaterialIcons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* MODAL REGIÓN (FILTRO) */}
      <Modal visible={modalRegionVisible} transparent animationType="slide" onRequestClose={() => setModalRegionVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white rounded-t-3xl min-h-[50%] max-h-[80%] pb-8">
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800">Filtrar por Región</Text>
              <TouchableOpacity onPress={() => setModalRegionVisible(false)} className="p-2 bg-slate-100 rounded-full">
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: "TODOS", name: "Todas las Regiones" }, ...regionesDisponibles.map(r => ({ id: r, name: r }))]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              renderItem={({ item }) => {
                const isActive = item.id === "TODOS" ? activeRegion === "" : activeRegion === item.name;
                return (
                  <TouchableOpacity
                    className={`py-4 px-4 border-b border-slate-50 flex-row justify-between items-center ${isActive ? 'rounded-xl border-b-0' : ''}`}
                    style={isActive ? { backgroundColor: 'rgba(239, 246, 255, 0.5)' } : {}}
                    onPress={() => {
                      if (item.id === "TODOS") {
                        setActiveRegion("");
                        setActiveComuna("");
                      } else {
                        setActiveRegion(item.name);
                        setActiveComuna(""); // reset comuna
                      }
                      setModalRegionVisible(false);
                    }}
                  >
                    <Text className={`text-[15px] ${isActive ? 'font-bold text-[#1152d4]' : 'text-slate-700'}`}>{item.name}</Text>
                    {isActive && <MaterialIcons name="check" size={20} color="#1152d4" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* MODAL COMUNA (FILTRO) */}
      <Modal visible={modalComunaVisible} transparent animationType="slide" onRequestClose={() => setModalComunaVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white rounded-t-3xl min-h-[50%] max-h-[80%] pb-8">
            <View className="flex-row justify-between items-center px-6 py-4 border-b border-slate-100">
              <Text className="text-lg font-bold text-slate-800">Filtrar por Comuna</Text>
              <TouchableOpacity onPress={() => setModalComunaVisible(false)} className="p-2 bg-slate-100 rounded-full">
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={[{ id: "TODOS", name: "Todas las Comunas" }, ...comunasDisponibles.map(c => ({ id: c, name: c }))]}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8 }}
              renderItem={({ item }) => {
                const isActive = item.id === "TODOS" ? activeComuna === "" : activeComuna === item.name;
                return (
                  <TouchableOpacity
                    className={`py-4 px-4 border-b border-slate-50 flex-row justify-between items-center ${isActive ? 'rounded-xl border-b-0' : ''}`}
                    style={isActive ? { backgroundColor: 'rgba(239, 246, 255, 0.5)' } : {}}
                    onPress={() => {
                      if (item.id === "TODOS") {
                        setActiveComuna("");
                      } else {
                        setActiveComuna(item.name);
                      }
                      setModalComunaVisible(false);
                    }}
                  >
                    <Text className={`text-[15px] ${isActive ? 'font-bold text-[#1152d4]' : 'text-slate-700'}`}>{item.name}</Text>
                    {isActive && <MaterialIcons name="check" size={20} color="#1152d4" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
