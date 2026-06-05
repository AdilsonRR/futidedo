import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useGameStore } from '../store/gameStore';
import { CORES } from '../game/constants';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'SelecaoTime'>;
};

export default function SelecaoTimeScreen({ navigation }: Props) {
  const { setNomeJogador } = useGameStore();
  const [nomeJ1, setNomeJ1] = useState('Jogador 1');
  const [nomeJ2, setNomeJ2] = useState('Jogador 2');

  const iniciarPartida = () => {
    setNomeJogador(1, nomeJ1 || 'Jogador 1');
    setNomeJogador(2, nomeJ2 || 'Jogador 2');
    navigation.navigate('Partida');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>SELECIONE OS TIMES</Text>

      <View style={styles.jogadorCard}>
        <View style={[styles.corIndicador, { backgroundColor: CORES.JOGADOR_1 }]} />
        <Text style={styles.label}>JOGADOR 1</Text>
        <TextInput
          style={styles.input}
          value={nomeJ1}
          onChangeText={setNomeJ1}
          placeholder="Nome do Jogador 1"
          placeholderTextColor="#555"
          maxLength={15}
        />
      </View>

      <Text style={styles.vs}>VS</Text>

      <View style={styles.jogadorCard}>
        <View style={[styles.corIndicador, { backgroundColor: CORES.JOGADOR_2 }]} />
        <Text style={styles.label}>JOGADOR 2</Text>
        <TextInput
          style={styles.input}
          value={nomeJ2}
          onChangeText={setNomeJ2}
          placeholder="Nome do Jogador 2"
          placeholderTextColor="#555"
          maxLength={15}
        />
      </View>

      <TouchableOpacity style={styles.botaoIniciar} onPress={iniciarPartida}>
        <Text style={styles.botaoTexto}>INICIAR PARTIDA</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.voltar}>Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 24 },
  titulo: { fontSize: 20, fontWeight: '800', color: '#FFD700', letterSpacing: 3, marginBottom: 32 },
  jogadorCard: { width: '100%', backgroundColor: '#16213e', borderRadius: 12, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#333' },
  corIndicador: { width: 40, height: 8, borderRadius: 4, marginBottom: 8 },
  label: { fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 },
  input: { backgroundColor: '#0f3460', color: '#fff', padding: 12, borderRadius: 8, fontSize: 16 },
  vs: { fontSize: 24, fontWeight: '900', color: '#E63946', marginVertical: 8 },
  botaoIniciar: { width: '100%', backgroundColor: '#2D6A4F', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  botaoTexto: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  voltar: { color: '#555', marginTop: 20, fontSize: 14 },
});
