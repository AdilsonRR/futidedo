import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useGameStore } from '../store/gameStore';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: Props) {
  const { resetarPartida } = useGameStore();

  const iniciarJogo = () => {
    resetarPartida();
    navigation.navigate('SelecaoTime');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>⚽ FUTIDEDO</Text>
      <Text style={styles.subtitulo}>Jogo de Botão 1v1</Text>

      <View style={styles.menu}>
        <TouchableOpacity style={[styles.botao, styles.botaoPrimario]} onPress={iniciarJogo}>
          <Text style={styles.botaoTexto}>JOGAR</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.botao} onPress={() => navigation.navigate('Configuracoes')}>
          <Text style={styles.botaoTexto}>CONFIGURAÇÕES</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rodape}>Passe o celular para o adversário!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', padding: 24 },
  titulo: { fontSize: 38, fontWeight: '900', color: '#FFD700', letterSpacing: 4 },
  subtitulo: { fontSize: 14, color: '#888', marginTop: 6, marginBottom: 48, letterSpacing: 2 },
  menu: { width: '100%', gap: 16 },
  botao: { backgroundColor: '#16213e', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  botaoPrimario: { backgroundColor: '#E63946' },
  botaoTexto: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  rodape: { position: 'absolute', bottom: 32, color: '#555', fontSize: 12 },
});
