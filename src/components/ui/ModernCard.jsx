import React from 'react';
import { View } from 'react-native';

export default function ModernCard({
  children,
  className = '',
  style,
  noPadding = false,
}) {
  return (
    <View
      style={style}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm ${
        noPadding ? '' : 'p-4'
      } ${className}`}
    >
      {children}
    </View>
  );
}
