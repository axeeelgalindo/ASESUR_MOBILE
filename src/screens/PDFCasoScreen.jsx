import React, { useState } from "react";
import { View, Text, Linking, ActivityIndicator, TouchableOpacity } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { BASE_URL } from "../../api/client";
import ModernHeader from "../components/ui/ModernHeader";
import ModernCard from "../components/ui/ModernCard";

export default function PDFCasoScreen({ route, navigation }) {
  const { casoId } = route.params;
  const [busy, setBusy] = useState(false);

  const openPdf = async () => {
    setBusy(true);
    try {
      const url = `${BASE_URL}/casos/${casoId}/fotos.pdf`;
      await Linking.openURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-[#f8fafc]">
      <ModernHeader
        title="Ficha PDF"
        subtitle={`Caso #${casoId}`}
        onBack={() => navigation.goBack()}
      />

      <View className="flex-1 p-5 justify-center">
        <ModernCard className="items-center p-6 shadow-md">
          <View className="w-18 h-18 bg-rose-50 rounded-2xl items-center justify-center mb-4 border border-rose-100 p-3">
            <MaterialIcons name="picture-as-pdf" size={40} color="#e11d48" />
          </View>

          <Text className="text-lg font-black text-slate-900 text-center">
            Reporte Fotográfico PDF
          </Text>

          <Text className="text-slate-500 text-xs text-center mt-2 mb-6 max-w-[260px] leading-relaxed">
            Genera y descarga un documento PDF consolidado con todas las fotos,
            observaciones y metadatos registrados.
          </Text>

          <TouchableOpacity
            className="w-full h-12 bg-blue-600 rounded-xl items-center justify-center flex-row shadow-md"
            activeOpacity={0.7}
            onPress={openPdf}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <MaterialIcons
                  name="download"
                  size={18}
                  color="#ffffff"
                  style={{ marginRight: 6 }}
                />
                <Text className="text-white font-extrabold text-sm">
                  Descargar / Abrir PDF
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ModernCard>
      </View>
    </View>
  );
}