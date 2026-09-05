import React from 'react';
import { View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

const STATUS_CONFIG = {
  PENDIENTE: {
    label: 'Pendiente',
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
    icon: 'hourglass-empty',
    iconColor: '#b45309',
  },
  PENDIENTE_AUTORIZACION: {
    label: 'Pendiente Aut.',
    bg: '#fffbeb',
    border: '#fde68a',
    text: '#92400e',
    icon: 'hourglass-empty',
    iconColor: '#b45309',
  },
  ABIERTO: {
    label: 'Abierto',
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e40af',
    icon: 'folder-open',
    iconColor: '#2563eb',
  },
  INSPECCION: {
    label: 'Inspección',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#065f46',
    icon: 'engineering',
    iconColor: '#059669',
  },
  EN_PROCESO: {
    label: 'En Proceso',
    bg: '#eff6ff',
    border: '#bfdbfe',
    text: '#1e40af',
    icon: 'pending',
    iconColor: '#1d4ed8',
  },
  EN_REVISION: {
    label: 'En Revisión',
    bg: '#eef2ff',
    border: '#c7d2fe',
    text: '#3730a3',
    icon: 'visibility',
    iconColor: '#4338ca',
  },
  AUTORIZADO: {
    label: 'Autorizado',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#065f46',
    icon: 'check-circle',
    iconColor: '#047857',
  },
  APROBADO: {
    label: 'Aprobado',
    bg: '#ecfdf5',
    border: '#a7f3d0',
    text: '#065f46',
    icon: 'check-circle',
    iconColor: '#047857',
  },
  RECHAZADO: {
    label: 'Rechazado',
    bg: '#fff1f2',
    border: '#fecdd3',
    text: '#9f1239',
    icon: 'cancel',
    iconColor: '#be123c',
  },
  FINALIZADO: {
    label: 'Finalizado',
    bg: '#f0fdfa',
    border: '#99f6e4',
    text: '#115e59',
    icon: 'verified',
    iconColor: '#0f766e',
  },
  CERRADO: {
    label: 'Cerrado',
    bg: '#f1f5f9',
    border: '#cbd5e1',
    text: '#334155',
    icon: 'lock',
    iconColor: '#475569',
  },
  BORRADOR: {
    label: 'Borrador',
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#475569',
    icon: 'edit-note',
    iconColor: '#475569',
  },
};

export default function StatusBadge({ status, size = 'md' }) {
  const normalizedKey = String(status || '').toUpperCase().replaceAll(' ', '_');
  const config = STATUS_CONFIG[normalizedKey] || {
    label: String(status || 'Desconocido').replaceAll('_', ' '),
    bg: '#f8fafc',
    border: '#e2e8f0',
    text: '#475569',
    icon: 'info',
    iconColor: '#475569',
  };

  const isSmall = size === 'sm';

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 9999,
        backgroundColor: config.bg,
        borderColor: config.border,
        paddingHorizontal: isSmall ? 8 : 10,
        paddingVertical: isSmall ? 2 : 4,
      }}
    >
      <MaterialIcons
        name={config.icon}
        size={isSmall ? 12 : 14}
        color={config.iconColor}
        style={{ marginRight: 4 }}
      />
      <Text
        style={{
          fontWeight: '600',
          color: config.text,
          fontSize: isSmall ? 11 : 12,
        }}
      >
        {config.label}
      </Text>
    </View>
  );
}
