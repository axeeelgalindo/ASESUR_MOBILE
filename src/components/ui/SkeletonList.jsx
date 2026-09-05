import React, { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

function SkeletonItem() {
  const animatedOpacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedOpacity, {
          toValue: 0.85,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedOpacity]);

  return (
    <Animated.View style={{ opacity: animatedOpacity }}>
      <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm">
        <View className="flex-row items-center justify-between mb-3">
          <View className="h-5 w-24 bg-slate-200 rounded-md" />
          <View className="h-5 w-16 bg-slate-200 rounded-full" />
        </View>
        <View className="h-4 w-3/4 bg-slate-200 rounded-md mb-2" />
        <View className="h-3.5 w-1/2 bg-slate-200 rounded-md mb-4" />
        <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
          <View className="h-3 w-28 bg-slate-200 rounded-md" />
          <View className="h-3 w-12 bg-slate-200 rounded-md" />
        </View>
      </View>
    </Animated.View>
  );
}

export default function SkeletonList({ count = 4 }) {
  return (
    <View className="px-4 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonItem key={i} />
      ))}
    </View>
  );
}

