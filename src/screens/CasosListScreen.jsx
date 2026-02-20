import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { Card, Text, Chip, ActivityIndicator } from "react-native-paper";
import { api } from "../../api/client";

export default function CasosListScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await api.get("/casos?etapa=CAPTACION");
      setItems(res.data.items || []);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={{ padding: 12 }}>
      {items.map((c) => (
        <Card
          key={c.id}
          style={{ marginBottom: 12 }}
          onPress={() => navigation.navigate("CasoDetalle", { id: c.id })}
        >
          <Card.Content>
            <Text variant="titleMedium">
              #{c.folio} - {c.nombreCliente}
            </Text>

            <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
              <Chip>{c.estado}</Chip>
              <Chip>{c.etapa}</Chip>
            </View>

            <Text style={{ marginTop: 6 }}>
              {c.direccion} - {c.comuna}
            </Text>
          </Card.Content>
        </Card>
      ))}
    </ScrollView>
  );
}
