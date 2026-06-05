import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../navigation';
import { useGameStore } from '../store/gameStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Resultado'>;
  route: RouteProp<RootStackParamList, 'Resultado'>;
};

export default function ResultadoScreen({ navigation, route }: Props) {
  const { vencedorId, nomeVencedor } = route.params;
  const { partida, resetarPartida } = useGameStore();
  const corVencedor = vencedorId === 1 ? '#E63946' : '#2196F3';

  const revanche = () => {
    resetarPartida();
    navigation.replace('Partida');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.trofeu}>🏆</Text>
      <Text style={[styles.vencedor, { color: corVencedor }]}>{nomeVencedor}</Text>
      <Text style={styles.titulo}>VENCEU!</Text>

      <View style={styles.placarFinal}>
        <Text style={styles.placarTexto}>
          {partida.jogador1.gols} x {partida.jogador2.gols}
        </Text>
        <Text style={styles.placarNomes}>
          {partida.jogador1.nome}  vs  {partida.jogador2.nome}
        </Text>
      </View>

      <TouchableOpacity style={[styles.botao, { backgroundColor: corVencedor }]} onPress={revanche}>
        <Text style={styles.botaoTexto}>REVANCHE</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.botaoSecundario} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.botaoSecTexto}>Menu Principal</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 24 },
  trofeu: { fontSize: 72 },
  vencedor: { fontSize: 32, fontWeight: '900', letterSpacing: 2, marginTop: 16 },
  titulo: { fontSize: 20, color: '#FFD700', fontWeight: '800', letterSpacing: 4 },
  placarFinal: { marginTop: 32, alignItems: 'center' },
  placarTexto: { fontSize: 48, fontWeight: '900', color: '#fff' },
  placarNomes: { fontSize: 13, color: '#666', marginTop: 4 },
  botao: { width: '100%', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 40 },
  botaoTexto: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  botaoSecundario: { marginTop: 16, padding: 12 },
  botaoSecTexto: { color: '#555', fontSize: 14 },
});
