import React from "react";
import { View } from "react-native";
import { Text, ProgressBar } from "react-native-paper";

export default function StepHeader({ title, step, total }) {
  const progress = total > 0 ? step / total : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <Text variant="titleLarge" style={{ marginBottom: 6 }}>{title}</Text>
      <ProgressBar progress={progress} />
      <Text style={{ marginTop: 6, opacity: 0.7 }}>
        Paso {step} de {total}
      </Text>
    </View>
  );
}
