import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Splash'>;
};

export default function SplashScreen({ navigation }: Props) {
  const escala = new Animated.Value(0);

  useEffect(() => {
    Animated.spring(escala, {
      toValue: 1,
      tension: 50,
      friction: 5,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => navigation.replace('Home'), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={{ transform: [{ scale: escala }] }}>
        <Text style={styles.emoji}>⚽</Text>
        <Text style={styles.titulo}>FUTIDEDO</Text>
        <Text style={styles.subtitulo}>Jogo de Botão</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: { fontSize: 64, textAlign: 'center' },
  titulo: { fontSize: 42, fontWeight: '900', color: '#FFD700', textAlign: 'center', letterSpacing: 4 },
  subtitulo: { fontSize: 16, color: '#aaa', textAlign: 'center', marginTop: 8, letterSpacing: 2 },
});
