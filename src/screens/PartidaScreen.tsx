import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, PanResponder, TouchableOpacity,
  Animated, Alert, GestureResponderEvent,
} from 'react-native';
import Svg, { Line, Circle, Defs, Marker, Path } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useGameStore } from '../store/gameStore';
import { Botao } from '../game/entities/types';
import { CAMPO, BOTAO, CORES, PARTIDA } from '../game/constants';
import CampoSVG from '../components/CampoSVG';
import { stepPhysics, tudoParado, speed } from '../game/systems/physics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Partida'>;
};

const W = CAMPO.LARGURA;
const H = CAMPO.ALTURA;

export default function PartidaScreen({ navigation }: Props) {
  const store = useGameStore();
  const { partida } = store;

  // Local physics state (não usa store para não re-render a cada frame)
  const botoesRef = useRef<Botao[]>(partida.botoes.map((b) => ({ ...b })));
  const bolaRef = useRef({ ...partida.bola, posicao: { ...partida.bola.posicao }, velocidade: { ...partida.bola.velocidade } });
  const animFrameRef = useRef<number | null>(null);
  const rodandoRef = useRef(false);
  const tocouBolaRef = useRef(false);

  const [renderTick, setRenderTick] = useState(0);
  const [turno, setTurno] = useState<1 | 2>(partida.turnoAtual);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [paleta, setPaleta] = useState<{ x: number; y: number } | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [golVisivel, setGolVisivel] = useState(false);
  const [placar, setPlacar] = useState({ j1: 0, j2: 0 });

  const forceRender = useCallback(() => setRenderTick((t) => t + 1), []);

  // Game loop
  const iniciarLoop = useCallback(() => {
    if (rodandoRef.current) return;
    rodandoRef.current = true;

    const loop = () => {
      const resultado = stepPhysics(botoesRef.current, bolaRef.current);
      botoesRef.current = resultado.botoes;
      bolaRef.current = resultado.bola;
      if (resultado.tocouBola) tocouBolaRef.current = true;

      // Gol detectado
      if (resultado.bolaEmGol !== null) {
        rodandoRef.current = false;
        const marcou = resultado.bolaEmGol === 1 ? 1 : 2; // quem marcou
        setPlacar((prev) => {
          const novo = { ...prev };
          if (marcou === 1) novo.j1++;
          else novo.j2++;
          const nomeVencedor = marcou === 1 ? partida.jogador1.nome : partida.jogador2.nome;
          const gols = marcou === 1 ? novo.j1 : novo.j2;
          if (gols >= partida.golsParaVencer) {
            setTimeout(() => {
              navigation.replace('Resultado', { vencedorId: marcou, nomeVencedor });
            }, 1500);
          } else {
            setGolVisivel(true);
            setMensagem(`⚽ GOL de ${nomeVencedor}!`);
            setTimeout(() => {
              setGolVisivel(false);
              setMensagem(null);
              reiniciarBola();
              setTurno(marcou === 1 ? 2 : 1); // quem levou gol começa
            }, PARTIDA.PAUSA_GOL_MS);
          }
          return novo;
        });
        forceRender();
        return;
      }

      // Falta detectada
      if (resultado.faltaDetectada && !rodandoRef.current) {
        // handled below
      }
      if (resultado.faltaDetectada) {
        rodandoRef.current = false;
        const faltoso = resultado.faltaDetectada.jogadorFaltoso;
        const nomeFaltoso = faltoso === 1 ? partida.jogador1.nome : partida.jogador2.nome;
        setMensagem(`🟨 FALTA de ${nomeFaltoso}!`);
        setTimeout(() => {
          setMensagem(null);
          // Bola para onde estava antes + turno para adversário
          setTurno(faltoso === 1 ? 2 : 1);
          // Para tudo
          botoesRef.current = botoesRef.current.map((b) => ({ ...b, velocidade: { x: 0, y: 0 } }));
          bolaRef.current.velocidade = { x: 0, y: 0 };
          forceRender();
        }, 1500);
        forceRender();
        return;
      }

      forceRender();

      if (tudoParado(botoesRef.current, bolaRef.current)) {
        rodandoRef.current = false;
        // Se não tocou a bola, passa o turno
        if (!tocouBolaRef.current) {
          setTurno((t) => t === 1 ? 2 : 1);
          setMensagem('Não tocou a bola — turno perdido!');
          setTimeout(() => setMensagem(null), 1200);
        }
        // Se tocou, mantém o turno (regra: acertou a bola = continua)
        tocouBolaRef.current = false;
        return;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  }, []);

  const reiniciarBola = () => {
    bolaRef.current = {
      posicao: { x: W / 2, y: H / 2 },
      velocidade: { x: 0, y: 0 },
      raio: BOTAO.RAIO_BOLA,
    };
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Toque no campo: selecionar botão do turno atual
  const handleCampoPress = (evt: GestureResponderEvent) => {
    if (rodandoRef.current) return;
    const { locationX: tx, locationY: ty } = evt.nativeEvent;

    // Deselecionar se clicar longe
    if (selecionado && !paleta) { setSelecionado(null); return; }

    const botaoTocado = botoesRef.current.find((b) => {
      if (b.jogadorId !== turno) return false;
      const d = Math.sqrt((b.posicao.x - tx) ** 2 + (b.posicao.y - ty) ** 2);
      return d <= b.raio + 8;
    });

    if (botaoTocado) {
      setSelecionado(botaoTocado.id);
      setPaleta(null);
    }
  };

  // PanResponder para arrastar a paleta de direção
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX: tx, locationY: ty } = evt.nativeEvent;
        // Ver se clicou em botão do turno atual
        // (acessado via closure — usamos ref para turno e selecionado)
      },
      onPanResponderMove: (_, gs) => {
        if (!selectedRef.current) return;
        setPaleta({ x: gs.moveX - offsetRef.current.x, y: gs.moveY - offsetRef.current.y });
      },
      onPanResponderRelease: (_, gs) => {
        if (!selectedRef.current) return;
        const dx = gs.moveX - offsetRef.current.x - (botaoPosRef.current?.x ?? 0);
        const dy = gs.moveY - offsetRef.current.y - (botaoPosRef.current?.y ?? 0);
        arremessar(selectedRef.current, dx, dy);
        setPaleta(null);
      },
    })
  ).current;

  // Refs para closure do PanResponder
  const selectedRef = useRef<string | null>(null);
  const botaoPosRef = useRef<{ x: number; y: number } | null>(null);
  const offsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const turnoRef = useRef<1 | 2>(1);

  useEffect(() => { selectedRef.current = selecionado; }, [selecionado]);
  useEffect(() => { turnoRef.current = turno; }, [turno]);

  const arremessar = (id: string, dx: number, dy: number) => {
    const botao = botoesRef.current.find((b) => b.id === id);
    if (!botao || botao.jogadorId !== turno) return;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const forca = Math.min((d / 60) * BOTAO.FORCA_MAXIMA, BOTAO.FORCA_MAXIMA);
    const ux = dx / d, uy = dy / d;
    botoesRef.current = botoesRef.current.map((b) =>
      b.id === id ? { ...b, velocidade: { x: ux * forca, y: uy * forca } } : b
    );
    setSelecionado(null);
    setPaleta(null);
    tocouBolaRef.current = false;
    iniciarLoop();
  };

  const botaoSelecionadoObj = selecionado
    ? botoesRef.current.find((b) => b.id === selecionado)
    : null;

  const jogadorAtual = turno === 1 ? partida.jogador1 : partida.jogador2;
  const corTurno = turno === 1 ? CORES.JOGADOR_1 : CORES.JOGADOR_2;

  return (
    <View style={styles.container}>
      {/* Placar */}
      <View style={styles.placarBar}>
        <View style={styles.placarBloco}>
          <Text style={[styles.placarNome, { color: CORES.JOGADOR_1 }]} numberOfLines={1}>
            {partida.jogador1.nome}
          </Text>
          <Text style={[styles.placarGol, { color: CORES.JOGADOR_1 }]}>{placar.j1}</Text>
        </View>
        <Text style={styles.placarX}>x</Text>
        <View style={[styles.placarBloco, { alignItems: 'flex-end' }]}>
          <Text style={[styles.placarNome, { color: CORES.JOGADOR_2 }]} numberOfLines={1}>
            {partida.jogador2.nome}
          </Text>
          <Text style={[styles.placarGol, { color: CORES.JOGADOR_2 }]}>{placar.j2}</Text>
        </View>
      </View>

      <Text style={[styles.turnoTexto, { color: corTurno }]}>
        {selecionado ? 'Arraste para direcionar e soltar para arremessar' : `Vez de ${jogadorAtual.nome} — toque num botão`}
      </Text>

      {/* Campo */}
      <View
        style={[styles.campo, { width: W, height: H }]}
        onTouchEnd={handleCampoPress}
      >
        <CampoSVG />

        {/* Paleta de direção (SVG overlay) */}
        {botaoSelecionadoObj && paleta && (
          <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
            <Line
              x1={botaoSelecionadoObj.posicao.x}
              y1={botaoSelecionadoObj.posicao.y}
              x2={paleta.x}
              y2={paleta.y}
              stroke={CORES.SELECIONADO}
              strokeWidth={3}
              strokeDasharray="8,5"
            />
            <Circle
              cx={paleta.x}
              cy={paleta.y}
              r={6}
              fill={CORES.SELECIONADO}
              opacity={0.8}
            />
          </Svg>
        )}

        {/* Botões dos jogadores */}
        {botoesRef.current.map((b) => {
          const isGk = b.tipo === 'goleiro';
          const isSel = b.id === selecionado;
          return (
            <TouchableOpacity
              key={b.id}
              activeOpacity={0.8}
              onPress={() => {
                if (rodandoRef.current) return;
                if (b.jogadorId !== turno) return;
                if (selecionado === b.id) { setSelecionado(null); return; }
                setSelecionado(b.id);
                botaoPosRef.current = b.posicao;
              }}
              onLongPress={() => {
                if (b.jogadorId !== turno || rodandoRef.current) return;
                setSelecionado(b.id);
                botaoPosRef.current = b.posicao;
              }}
              style={[
                styles.botao,
                {
                  left: b.posicao.x - (isGk ? BOTAO.RAIO_GOLEIRO_W : b.raio),
                  top: b.posicao.y - (isGk ? BOTAO.RAIO_GOLEIRO_H : b.raio),
                  width: isGk ? BOTAO.RAIO_GOLEIRO_W * 2 : b.raio * 2,
                  height: isGk ? BOTAO.RAIO_GOLEIRO_H * 2 : b.raio * 2,
                  borderRadius: isGk ? 6 : b.raio,
                  backgroundColor: b.cor,
                  borderWidth: isSel ? 3 : 1.5,
                  borderColor: isSel ? CORES.SELECIONADO : 'rgba(255,255,255,0.5)',
                  shadowColor: isSel ? CORES.SELECIONADO : '#000',
                  shadowOpacity: isSel ? 0.9 : 0.4,
                  shadowRadius: isSel ? 8 : 3,
                  elevation: isSel ? 8 : 3,
                },
              ]}
            />
          );
        })}

        {/* Bola */}
        <View
          style={[
            styles.bola,
            {
              left: bolaRef.current.posicao.x - BOTAO.RAIO_BOLA,
              top: bolaRef.current.posicao.y - BOTAO.RAIO_BOLA,
              width: BOTAO.RAIO_BOLA * 2,
              height: BOTAO.RAIO_BOLA * 2,
            },
          ]}
        />

        {/* Mensagem de gol/falta */}
        {mensagem && (
          <View style={styles.mensagemOverlay}>
            <Text style={styles.mensagemTexto}>{mensagem}</Text>
          </View>
        )}
      </View>

      {/* Rodapé */}
      <View style={styles.rodape}>
        {selecionado && !rodandoRef.current && (
          <TouchableOpacity
            style={styles.btnArremessar}
            onPress={() => {
              // Arremessar direto na direção da bola
              const b = botoesRef.current.find((bt) => bt.id === selecionado);
              if (!b) return;
              const dx = bolaRef.current.posicao.x - b.posicao.x;
              const dy = bolaRef.current.posicao.y - b.posicao.y;
              arremessar(selecionado, dx * 3, dy * 3);
            }}
          >
            <Text style={styles.btnArremessarTexto}>ARREMESSAR → BOLA</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.btnPausar}>
          <Text style={styles.btnPausarTexto}>⏸ Pausar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111', alignItems: 'center' },
  placarBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 20, paddingTop: 48, paddingBottom: 6,
    backgroundColor: '#1a1a2e',
  },
  placarBloco: { flex: 1 },
  placarNome: { fontSize: 13, fontWeight: '700' },
  placarGol: { fontSize: 28, fontWeight: '900' },
  placarX: { color: '#444', fontSize: 18, marginHorizontal: 12 },
  turnoTexto: { fontSize: 11, textAlign: 'center', paddingVertical: 4, backgroundColor: '#1a1a2e', width: '100%', letterSpacing: 0.5 },
  campo: {
    backgroundColor: CORES.CAMPO,
    overflow: 'visible',
    position: 'relative',
  },
  botao: { position: 'absolute' },
  bola: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#222',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  mensagemOverlay: {
    position: 'absolute', top: '40%', left: 0, right: 0,
    alignItems: 'center',
  },
  mensagemTexto: {
    backgroundColor: 'rgba(0,0,0,0.75)', color: '#FFD700',
    fontSize: 22, fontWeight: '900', paddingHorizontal: 24, paddingVertical: 12,
    borderRadius: 12, overflow: 'hidden',
  },
  rodape: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 16, paddingHorizontal: 16,
  },
  btnArremessar: {
    backgroundColor: '#E63946', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8,
  },
  btnArremessarTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnPausar: { padding: 10 },
  btnPausarTexto: { color: '#555', fontSize: 13 },
});
