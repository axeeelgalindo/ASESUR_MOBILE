import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Keyboard, Platform, StyleSheet, LayoutAnimation, UIManager } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Enable LayoutAnimation for Android if needed (though we'll only animate iOS directly as native Android handles its own layout resizing)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function GlobalKeyboardToolbar() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        // Escuchar eventos de teclado
        const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
        const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

        const onShow = (e) => {
            // Activar animación en iOS para que fluya junto al teclado
            if (Platform.OS === 'ios') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            setKeyboardHeight(e.endCoordinates.height);
        };

        const onHide = () => {
            if (Platform.OS === 'ios') {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            }
            setKeyboardHeight(0);
        };

        const showListener = Keyboard.addListener(showEvent, onShow);
        const hideListener = Keyboard.addListener(hideEvent, onHide);

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    if (keyboardHeight === 0) return null;

    return (
        <View
            style={[styles.toolbar, { bottom: keyboardHeight }]}
            className="bg-slate-100 border-t border-slate-200"
        >
            <TouchableOpacity
                onPress={() => Keyboard.dismiss()}
                className="px-4 flex-row items-center justify-end w-full h-full"
                activeOpacity={0.7}
            >
                <Text className="text-[#1152d4] font-bold text-[15px] mr-1">Listo</Text>
                <MaterialIcons name="keyboard-hide" size={20} color="#1152d4" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    toolbar: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 99999, // Asegurar que esté por encima del resto
        height: 44, // Default accessory view height iOS
    }
});
