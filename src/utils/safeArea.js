import { Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Hook para obtener insets seguros compatibles al 100% con iOS y Android.
 * Con statusBarTranslucent: true, el fondo blanco del topbar se extiende
 * detrás de la barra de estado transparente (eliminando la franja negra),
 * y el contenido del encabezado comienza exactamente debajo de la hora y la cámara.
 */
export function useSafeScreenInsets() {
  const insets = useSafeAreaInsets();
  const androidStatusBar = Platform.OS === "android" ? (StatusBar.currentHeight || 0) : 0;

  const top = Math.max(insets.top, androidStatusBar);
  const bottom = Math.max(insets.bottom, Platform.OS === "android" ? 16 : 0);

  return {
    top,
    bottom,
    left: insets.left,
    right: insets.right,
    rawInsets: insets,
  };
}
