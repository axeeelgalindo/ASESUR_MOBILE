import React from 'react';
import { TouchableOpacity } from 'react-native';

export default function ScalePressable({
  children,
  onPress,
  onLongPress,
  disabled = false,
  style,
  className = '',
  activeOpacity = 0.7,
  ...rest
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      className={className}
      style={style}
      {...rest}
    >
      {children}
    </TouchableOpacity>
  );
}
