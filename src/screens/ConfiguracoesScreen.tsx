import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Configuracoes'>;
};

const opcoes = [1, 3, 5, 7];

export default function ConfiguracoesScreen({ navigation }: Props) {
  const [golsParaVencer, setGolsParaVencer] = React.useState(3);

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>CONFIGURAÇÕES</Text>

      <View style={styles.secao}>
        <Text style={styles.label}>GOLS PARA VENCER</Text>
        <View style={styles.opcoes}>
          {opcoes.map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.opcao, golsParaVencer === n && styles.opcaoAtiva]}
              onPress={() => setGolsParaVencer(n)}
            >
              <Text style={[styles.opcaoTexto, golsParaVencer === n && styles.opcaoTextoAtiva]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity style={styles.btnVoltar} onPress={() => navigation.goBack()}>
        <Text style={styles.btnVoltarTexto}>Salvar e Voltar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 24, paddingTop: 60 },
  titulo: { fontSize: 20, fontWeight: '800', color: '#FFD700', letterSpacing: 3, marginBottom: 32 },
  secao: { marginBottom: 32 },
  label: { fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 },
  opcoes: { flexDirection: 'row', gap: 12 },
  opcao: { width: 56, height: 56, borderRadius: 8, backgroundColor: '#16213e', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  opcaoAtiva: { backgroundColor: '#E63946', borderColor: '#E63946' },
  opcaoTexto: { color: '#888', fontSize: 18, fontWeight: '700' },
  opcaoTextoAtiva: { color: '#fff' },
  btnVoltar: { marginTop: 'auto', backgroundColor: '#2D6A4F', padding: 18, borderRadius: 12, alignItems: 'center' },
  btnVoltarTexto: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
