import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeScreenInsets } from '../../utils/safeArea';

export default function ModernHeader({
  title,
  subtitle,
  onBack,
  rightElement,
  backIcon = 'arrow-back-ios-new',
  className = '',
}) {
  const { top: topPadding } = useSafeScreenInsets();

  return (
    <View
      style={{ paddingTop: topPadding }}
      className={`bg-white border-b border-slate-100 ${className}`}
    >
      <View className="h-14 px-4 flex-row items-center justify-between">
        <View className="flex-row items-center flex-1 pr-2">
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              activeOpacity={0.7}
              className="w-10 h-10 -ml-2 mr-2 rounded-full items-center justify-center bg-slate-50 border border-slate-200/60"
            >
              <MaterialIcons name={backIcon} size={20} color="#1e293b" />
            </TouchableOpacity>
          )}

          <View className="flex-1">
            <Text
              numberOfLines={1}
              className="text-lg font-bold text-slate-900 tracking-tight"
            >
              {title}
            </Text>
            {subtitle && (
              <Text
                numberOfLines={1}
                className="text-xs text-slate-500 font-medium"
              >
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        {rightElement && (
          <View className="flex-row items-center ml-2">{rightElement}</View>
        )}
      </View>
    </View>
  );
}
