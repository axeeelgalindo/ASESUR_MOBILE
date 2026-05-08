import React from 'react';
import { View, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { MaterialIcons } from '@expo/vector-icons';

export default function InteractiveMap({ coordinates, hasLocation, onLocationSelect }) {
    return (
        <View className="w-full h-full">
            <MapView
                style={{ width: '100%', height: '100%' }}
                region={{
                    ...coordinates,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                }}
                onPress={(e) => onLocationSelect(e.nativeEvent.coordinate)}
            >
                {hasLocation && <Marker coordinate={coordinates} />}
            </MapView>
        </View>
    );
}
