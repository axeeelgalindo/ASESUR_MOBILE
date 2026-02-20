import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, View } from "react-native";
import { Button, Card, Chip, IconButton, Text } from "react-native-paper";
import { useAuth } from "../auth/AuthContext";
import { api } from "../../api/client";

function EtapaChip({ etapa }) {
  return <Chip compact>{etapa}</Chip>;
}

export default function CaptacionesListScreen({ navigation }) {
  const { me, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await api.get("/casos", {
        params: { etapa: "CAPTACION", page: 1, pageSize: 50 },
      });
      setItems(res.data?.items || []);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar captaciones");
    }
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <IconButton icon="refresh" onPress={load} />
          <IconButton icon="logout" onPress={signOut} />
        </View>
      ),
      title: `Captaciones (${me?.rol || ""})`,
    });
  }, [navigation, me, load, signOut]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <Button
        mode="contained"
        icon="plus"
        onPress={() => navigation.navigate("NuevaCaptacion")}
        style={{ marginBottom: 12 }}
      >
        Nueva Captación
      </Button>

      {!!error && (
        <Card style={{ padding: 12, marginBottom: 12 }}>
          <Text style={{ color: "#B00020" }}>{error}</Text>
        </Card>
      )}

      <FlatList
        data={items}
        keyExtractor={(x) => x.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={{ opacity: 0.7 }}>No hay captaciones.</Text>}
        renderItem={({ item }) => (
          <Card
            style={{ marginBottom: 10 }}
            onPress={() => navigation.navigate("CasoDetalle", { id: item.id })}
          >
            <Card.Title
              title={`Folio: ${item.folio ?? "-"}`}
              subtitle={`${item.nombreCliente ?? ""} • ${item.rutCliente ?? ""}`}
              right={() => <EtapaChip etapa={item.etapa} />}
            />
            <Card.Content>
              <Text style={{ opacity: 0.8 }}>
                {item.direccion ?? "-"} • {item.comuna ?? "-"} • {item.ciudad ?? "-"}
              </Text>
              <Text style={{ opacity: 0.7, marginTop: 4 }}>
                Estado: {item.estado} • Tipo: {item.tipo}
              </Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}
