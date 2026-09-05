import React from "react";
import { View, Text } from "react-native";

export default function StepHeader({ title, step, total }) {
  const progress = total > 0 ? (step / total) * 100 : 0;
  return (
    <View className="mb-3">
      <Text className="text-xl font-bold text-slate-900 mb-1.5">{title}</Text>
      <View className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
        <View
          className="h-full bg-blue-600 rounded-full"
          style={{ width: `${progress}%` }}
        />
      </View>
      <Text className="text-xs font-semibold text-slate-500 mt-1.5">
        Paso {step} de {total}
      </Text>
    </View>
  );
}
