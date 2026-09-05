import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Keyboard, Platform, StyleSheet, LayoutAnimation } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function GlobalKeyboardToolbar() {
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;

        const onShow = (e) => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(e.endCoordinates.height);
        };

        const onHide = () => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setKeyboardHeight(0);
        };

        const showListener = Keyboard.addListener('keyboardWillShow', onShow);
        const hideListener = Keyboard.addListener('keyboardWillHide', onHide);

        return () => {
            showListener.remove();
            hideListener.remove();
        };
    }, []);

    if (Platform.OS !== 'ios' || keyboardHeight === 0) return null;

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
