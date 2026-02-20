import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Text,
} from "react-native-paper";
import { api, PUBLIC_URL } from "../../api/client";

function prettyParte(p) {
  return String(p || "OTRO").replaceAll("_", " ");
}

function groupByParte(fotos = []) {
  const map = {};
  for (const f of fotos || []) {
    const k = f?.parteCasa || "OTRO";
    if (!map[k]) map[k] = [];
    map[k].push(f);
  }
  // orden desc por fecha
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => new Date(b.tomadaEn) - new Date(a.tomadaEn));
  }
  return map;
}

export default function CasoDetalleScreen({ route, navigation }) {
  const { id } = route.params;

  const [busy, setBusy] = useState(true);
  const [caso, setCaso] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.get(`/casos/${id}`);
      setCaso(res.data?.caso || null);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudo cargar el caso");
    } finally {
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // ✅ refrescar al volver desde FotosCaptacion / TomarFoto
  useEffect(() => {
    const unsub = navigation.addListener("focus", load);
    return unsub;
  }, [navigation, load]);

  const fotos = caso?.fotos || [];

  const grouped = useMemo(() => groupByParte(fotos), [fotos]);

  // ordenar las partes por: más fotos primero, luego alfabético
  const partesOrdenadas = useMemo(() => {
    const entries = Object.entries(grouped);
    entries.sort((a, b) => {
      const ca = a[1]?.length || 0;
      const cb = b[1]?.length || 0;
      if (cb !== ca) return cb - ca;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [grouped]);

  if (busy) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 12 }}>
        <Card style={{ padding: 12 }}>
          <Text style={{ color: "#B00020" }}>{error}</Text>
          <Button mode="outlined" style={{ marginTop: 12 }} onPress={load}>
            Reintentar
          </Button>
        </Card>
      </View>
    );
  }

  if (!caso) return null;

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      {/* ✅ Detalle principal */}
      <Card style={{ padding: 12, marginBottom: 12 }}>
        <Text variant="titleLarge">{caso.nombreCliente}</Text>
        <Text style={{ opacity: 0.7, marginBottom: 10 }}>
          {caso.rutCliente}
        </Text>

        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <Chip compact>{caso.etapa}</Chip>
          <Chip compact>{caso.estado}</Chip>
          <Chip compact>{caso.tipo}</Chip>
        </View>

        <Text style={{ marginTop: 12 }}>
          {caso.direccion} • {caso.comuna || "-"} • {caso.ciudad || "-"}
        </Text>

        <Text style={{ marginTop: 10, opacity: 0.8 }}>
          Email: {caso.emailCliente || "-"}
        </Text>
        <Text style={{ opacity: 0.8 }}>
          Fonos: {caso.telefonoCliente1 || "-"} /{" "}
          {caso.telefonoCliente2 || "-"}
        </Text>
        <Text style={{ opacity: 0.8 }}>
          Cuenta Corriente: {caso.cuentaCorriente || "-"}
        </Text>

        <Button
          mode="contained"
          icon="camera"
          style={{ marginTop: 12 }}
          onPress={() => navigation.navigate("FotosCaptacion", { casoId: caso.id })}
        >
          Fotos (captación)
        </Button>
      </Card>

      {/* ✅ Galería agrupada */}
      <Card style={{ padding: 12, marginBottom: 12 }}>
        <Text variant="titleMedium">Galería (por parte)</Text>
        <Text style={{ opacity: 0.7, marginTop: 4 }}>
          Total fotos: {fotos.length}
        </Text>

        <Divider style={{ marginVertical: 12 }} />

        {!fotos.length ? (
          <Text style={{ opacity: 0.7 }}>Aún no hay fotos.</Text>
        ) : (
          partesOrdenadas.map(([parte, list]) => (
            <View key={parte} style={{ marginBottom: 16 }}>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{prettyParte(parte)}</Text>
                <Text style={{ opacity: 0.75 }}>{list.length} foto(s)</Text>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {list.map((f) => {
                  const uri = `${PUBLIC_URL}${f.urlArchivo}`;
                  return (
                    <Image
                      key={f.id}
                      source={{ uri }}
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: 10,
                        marginRight: 10,
                        backgroundColor: "#eee",
                      }}
                    />
                  );
                })}
              </ScrollView>
            </View>
          ))
        )}
      </Card>

      {/* ✅ Asignación */}
      <Card style={{ padding: 12 }}>
        <Text variant="titleMedium" style={{ marginBottom: 8 }}>
          Asignación
        </Text>
        <Text>
          Captado por:{" "}
          {caso.captadoPor?.nombre || caso.captadoPor?.email || "-"}
        </Text>
        <Text>
          Asesor: {caso.asesor?.nombre || caso.asesor?.email || "-"}
        </Text>
      </Card>
    </ScrollView>
  );
}
