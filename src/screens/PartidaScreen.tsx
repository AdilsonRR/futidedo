import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, PanResponder, TouchableOpacity, Dimensions,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useGameStore } from '../store/gameStore';
import { Botao } from '../game/entities/types';
import { CAMPO, BOTAO, CORES } from '../game/constants';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Partida'>;
};

const { width } = Dimensions.get('window');
const ESCALA = (width - 32) / CAMPO.LARGURA;

export default function PartidaScreen({ navigation }: Props) {
  const { partida, setTurno, marcarGol } = useGameStore();
  const [botoes, setBotoes] = useState(partida.botoes);
  const [bola, setBola] = useState(partida.bola);
  const [turno, setTurnoLocal] = useState<1 | 2>(1);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [arrastoInicio, setArrastoInicio] = useState<{ x: number; y: number } | null>(null);

  const verificarGol = (posX: number) => {
    if (posX <= BOTAO.RAIO_BOLA + CAMPO.GOL_ALTURA) {
      marcarGol(2);
      return true;
    }
    if (posX >= CAMPO.LARGURA - BOTAO.RAIO_BOLA - CAMPO.GOL_ALTURA) {
      marcarGol(1);
      return true;
    }
    return false;
  };

  const selecionarBotao = (id: string) => {
    const b = botoes.find((bt) => bt.id === id);
    if (b && b.jogadorId === turno) setSelecionado(id);
  };

  const executarArremesso = (dx: number, dy: number) => {
    if (!selecionado) return;
    const forca = Math.min(Math.sqrt(dx * dx + dy * dy) / 5, BOTAO.FORCA_MAXIMA);
    const angulo = Math.atan2(dy, dx);
    const vx = Math.cos(angulo) * forca;
    const vy = Math.sin(angulo) * forca;

    setBotoes((prev) =>
      prev.map((b) => b.id === selecionado ? { ...b, velocidade: { x: vx, y: vy } } : b)
    );
    setSelecionado(null);
    setTurnoLocal(turno === 1 ? 2 : 1);
  };

  const jogadorAtual = turno === 1 ? partida.jogador1 : partida.jogador2;
  const corAtual = turno === 1 ? CORES.JOGADOR_1 : CORES.JOGADOR_2;

  return (
    <View style={styles.container}>
      <View style={styles.placar}>
        <Text style={[styles.nomeJogador, { color: CORES.JOGADOR_1 }]}>
          {partida.jogador1.nome}  {partida.jogador1.gols}
        </Text>
        <Text style={styles.vs}>x</Text>
        <Text style={[styles.nomeJogador, { color: CORES.JOGADOR_2 }]}>
          {partida.jogador2.gols}  {partida.jogador2.nome}
        </Text>
      </View>

      <Text style={[styles.turnoAviso, { color: corAtual }]}>
        Vez de {jogadorAtual.nome}
      </Text>

      <View style={[styles.campo, { width: CAMPO.LARGURA * ESCALA, height: CAMPO.ALTURA * ESCALA * 0.6 }]}>
        <View style={styles.linhaMetade} />

        {botoes.map((b) => (
          <TouchableOpacity
            key={b.id}
            onPress={() => selecionarBotao(b.id)}
            style={[
              styles.botao,
              {
                left: b.posicao.x * ESCALA - BOTAO.RAIO * ESCALA,
                top: b.posicao.y * ESCALA * 0.6 - BOTAO.RAIO * ESCALA,
                width: BOTAO.RAIO * 2 * ESCALA,
                height: BOTAO.RAIO * 2 * ESCALA,
                borderRadius: BOTAO.RAIO * ESCALA,
                backgroundColor: b.cor,
                opacity: b.ativo ? 1 : 0.3,
                borderWidth: selecionado === b.id ? 3 : 1,
                borderColor: selecionado === b.id ? '#FFD700' : 'rgba(255,255,255,0.3)',
              },
            ]}
          />
        ))}

        <View
          style={[
            styles.bola,
            {
              left: bola.posicao.x * ESCALA - BOTAO.RAIO_BOLA * ESCALA,
              top: bola.posicao.y * ESCALA * 0.6 - BOTAO.RAIO_BOLA * ESCALA,
              width: BOTAO.RAIO_BOLA * 2 * ESCALA,
              height: BOTAO.RAIO_BOLA * 2 * ESCALA,
              borderRadius: BOTAO.RAIO_BOLA * ESCALA,
            },
          ]}
        />
      </View>

      {selecionado && (
        <Text style={styles.instrucao}>Toque novamente para arremessar na direção da bola</Text>
      )}

      <TouchableOpacity style={styles.btnPausar} onPress={() => navigation.navigate('Home')}>
        <Text style={styles.btnPausarTexto}>Pausar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', alignItems: 'center', paddingTop: 48 },
  placar: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  nomeJogador: { fontSize: 16, fontWeight: '700' },
  vs: { color: '#555', marginHorizontal: 12, fontSize: 14 },
  turnoAviso: { fontSize: 13, fontWeight: '600', marginBottom: 12, letterSpacing: 1 },
  campo: { backgroundColor: CORES.CAMPO, borderRadius: 8, overflow: 'hidden', position: 'relative', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  linhaMetade: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  botao: { position: 'absolute' },
  bola: { position: 'absolute', backgroundColor: CORES.BOLA },
  instrucao: { color: '#FFD700', fontSize: 12, marginTop: 12, textAlign: 'center' },
  btnPausar: { marginTop: 20, padding: 10 },
  btnPausarTexto: { color: '#555', fontSize: 13 },
});
