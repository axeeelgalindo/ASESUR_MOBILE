import React, { useEffect, useState } from "react";
import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { api } from "../../api/client";
import ModernHeader from "../components/ui/ModernHeader";
import ModernCard from "../components/ui/ModernCard";
import ScalePressable from "../components/ui/ScalePressable";
import StatusBadge from "../components/ui/StatusBadge";
import SkeletonList from "../components/ui/SkeletonList";

export default function CasosListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/casos?etapa=CAPTACION");
      setItems(res.data?.items || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <ModernHeader
        title="Casos"
        subtitle="Listado general"
        onBack={() => navigation.goBack()}
      />

      {loading ? (
        <SkeletonList count={4} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {items.map((c) => (
            <ScalePressable
              key={c.id}
              className="mb-3"
              onPress={() => navigation.navigate("CasoDetalle", { id: c.id })}
            >
              <ModernCard className="p-4 shadow-sm">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-base font-extrabold text-slate-900 tracking-tight">
                    #{c.folio ?? "-"} {c.nombreCliente}
                  </Text>
                  <StatusBadge status={c.estado} size="sm" />
                </View>

                <View className="flex-row items-center mt-1">
                  <MaterialIcons name="location-on" size={14} color="#d97706" />
                  <Text className="text-xs text-slate-500 font-medium ml-1">
                    {c.direccion || "Sin dirección"} - {c.comuna || "Sin comuna"}
                  </Text>
                </View>
              </ModernCard>
            </ScalePressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
