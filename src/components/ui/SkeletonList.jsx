import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

function SkeletonItem() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.85, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-slate-100 shadow-sm">
      <View className="flex-row items-center justify-between mb-3">
        <Animated.View
          style={animatedStyle}
          className="h-5 w-24 bg-slate-200 rounded-md"
        />
        <Animated.View
          style={animatedStyle}
          className="h-5 w-16 bg-slate-200 rounded-full"
        />
      </View>
      <Animated.View
        style={animatedStyle}
        className="h-4 w-3/4 bg-slate-200 rounded-md mb-2"
      />
      <Animated.View
        style={animatedStyle}
        className="h-3.5 w-1/2 bg-slate-200 rounded-md mb-4"
      />
      <View className="flex-row justify-between items-center pt-2 border-t border-slate-100">
        <Animated.View
          style={animatedStyle}
          className="h-3 w-28 bg-slate-200 rounded-md"
        />
        <Animated.View
          style={animatedStyle}
          className="h-3 w-12 bg-slate-200 rounded-md"
        />
      </View>
    </View>
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
