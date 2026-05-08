import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Button, Card, Text } from "react-native-paper";


import { Linking } from "react-native";
import { BASE_URL } from "../../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PDFCasoScreen({ route, navigation }) {
  const { casoId } = route.params;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: "PDF Caso" });
  }, [navigation]);

  const openPdf = async () => {
    setBusy(true);
    try {
      const token = await AsyncStorage.getItem("token");
      const url = `${BASE_URL}/casos/${casoId}/fotos.pdf`;

      // OJO: si tu backend requiere auth, abrir en navegador no manda header.
      // Solución pro: crear endpoint público con token query temporal, o descargar y abrir local.
      // Por ahora: si está en LAN/dev, puedes dejarlo sin auth o manejar descarga.

      await Linking.openURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Card style={{ padding: 12 }}>
        <Text variant="titleMedium">PDF con fotos</Text>
        <Text style={{ opacity: 0.7, marginTop: 8 }}>
          Genera un PDF con todas las fotos del caso.
        </Text>

        <Button mode="contained" style={{ marginTop: 12 }} loading={busy} disabled={busy} onPress={openPdf}>
          Abrir PDF
        </Button>
      </Card>
    </View>
  );
}