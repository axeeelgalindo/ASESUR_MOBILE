import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Text,
} from "react-native-paper";
import { api, PUBLIC_URL } from "../../api/client";

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
  "OTRO",
];

function prettyParte(p) {
  return p.replaceAll("_", " ");
}

function groupByParte(fotos = []) {
  const map = {};
  for (const f of fotos) {
    const k = f.parteCasa || "OTRO";
    if (!map[k]) map[k] = [];
    map[k].push(f);
  }
  // ordena por fecha descendente dentro de cada parte
  for (const k of Object.keys(map)) {
    map[k].sort((a, b) => new Date(b.tomadaEn) - new Date(a.tomadaEn));
  }
  return map;
}

export default function FotosCaptacionScreen({ route, navigation }) {
  const { casoId } = route.params;

  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [fotos, setFotos] = useState([]);

  const load = useCallback(async () => {
    setError("");
    setBusy(true);
    try {
      const res = await api.get(`/casos/${casoId}/fotos`);
      setFotos(res.data?.fotos || []);
    } catch (e) {
      setError(e?.response?.data?.message || "No se pudieron cargar las fotos");
    } finally {
      setBusy(false);
    }
  }, [casoId]);

  useEffect(() => {
    navigation.setOptions({ title: "Fotos Captación" });
    const unsub = navigation.addListener("focus", load); // ✅ refresca al volver desde cámara
    return unsub;
  }, [navigation, load]);

  const grouped = useMemo(() => groupByParte(fotos), [fotos]);

  const counts = useMemo(() => {
    const c = {};
    for (const p of PARTES) c[p] = grouped[p]?.length || 0;
    return c;
  }, [grouped]);

  const faltantes = useMemo(() => {
    return PARTES.filter((p) => (counts[p] || 0) < 1);
  }, [counts]);

  const allOk = faltantes.length === 0;

  const openCamera = (parteCasa) => {
    navigation.navigate("TomarFoto", { casoId, parteCasa });
  };

  if (busy) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 12 }}>
      {!!error && (
        <Card style={{ padding: 12, marginBottom: 12 }}>
          <Text style={{ color: "#B00020" }}>{error}</Text>
          <Button mode="outlined" style={{ marginTop: 10 }} onPress={load}>
            Reintentar
          </Button>
        </Card>
      )}

      <Card style={{ padding: 12, marginBottom: 12 }}>
        <Text variant="titleMedium">Obligatorio</Text>
        <Text style={{ opacity: 0.75, marginTop: 6 }}>
          Debes subir mínimo{" "}
          <Text style={{ fontWeight: "700" }}>1 foto por parte</Text> antes de
          finalizar.
        </Text>

        {!allOk ? (
          <Text style={{ marginTop: 8, color: "#B00020" }}>
            Faltan: {faltantes.map(prettyParte).join(", ")}
          </Text>
        ) : (
          <Text style={{ marginTop: 8, color: "green" }}>
            ✅ Listo: tienes mínimo 1 foto en cada parte.
          </Text>
        )}

        <Divider style={{ marginVertical: 12 }} />

        <Button
          mode="contained"
          icon="check"
          disabled={!allOk}
          onPress={() => navigation.replace("CasoDetalle", { id: casoId })}
        >
          Finalizar y volver al detalle
        </Button>
      </Card>

      {PARTES.map((p) => {
        const list = grouped[p] || [];
        const count = list.length;

        return (
          <Card key={p} style={{ padding: 12, marginBottom: 12 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text variant="titleMedium">{prettyParte(p)}</Text>
              <Text style={{ opacity: 0.8 }}>{count} foto(s)</Text>
            </View>

            <Button
              mode="contained"
              icon="camera"
              style={{ marginTop: 10 }}
              onPress={() => openCamera(p)}
            >
              Sacar foto ({prettyParte(p)})
            </Button>

            {count > 0 ? (
              <ScrollView
                horizontal
                style={{ marginTop: 12 }}
                showsHorizontalScrollIndicator={false}
              >
                {list.slice(0, 8).map((f) => {
                  const uri = `${PUBLIC_URL}${encodeURI(f.urlArchivo)}`;
                  return (
                    <Image
                      key={f.id}
                      source={{ uri }}
                      resizeMode="cover"
                      onError={(e) =>
                        console.log("IMG ERROR", uri, e?.nativeEvent)
                      }
                      style={{
                        width: 110,
                        height: 110,
                        borderRadius: 10,
                        marginRight: 10,
                        backgroundColor: "#ddd",
                      }}
                    />
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={{ marginTop: 10, opacity: 0.7 }}>
                Aún no hay fotos para {prettyParte(p)}.
              </Text>
            )}
          </Card>
        );
      })}
    </ScrollView>
  );
}
