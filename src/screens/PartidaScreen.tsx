import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, PanResponder,
} from 'react-native';
import Svg, { Line, Circle, Polygon, G, Ellipse } from 'react-native-svg';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useGameStore } from '../store/gameStore';
import { Botao } from '../game/entities/types';
import { CAMPO, BOTAO, CORES, PARTIDA } from '../game/constants';
import CampoSVG from '../components/CampoSVG';
import { stepPhysics, tudoParado } from '../game/systems/physics';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Partida'>;
};

type Fase = 'selecionar' | 'mirar' | 'ajustar_gk' | 'animando';

interface Vec2 { x: number; y: number }
interface Direcao { ux: number; uy: number; forca: number; power: number }

const W        = CAMPO.LARGURA;
const H        = CAMPO.ALTURA;
const MAX_DRAG = 120;   // px → 100% de força
const GK_TIMER = 5;     // segundos para ajustar o goleiro

function corPower(p: number) {
  if (p < 0.38) return '#4CAF50';
  if (p < 0.72) return '#FFD700';
  return '#E63946';
}

// IDs fixos
const GK_ID: Record<1 | 2, string> = { 1: 'j1-b0', 2: 'j2-b0' };

export default function PartidaScreen({ navigation }: Props) {
  const { partida } = useGameStore();

  // ── Física em refs (evita re-render por frame) ────────────────────────
  const botoesRef  = useRef<Botao[]>(partida.botoes.map((b) => ({ ...b })));
  const bolaRef    = useRef({ ...partida.bola });
  const animRef    = useRef<number | null>(null);
  const rodandoRef = useRef(false);
  const tocouBolaRef = useRef(false);

  // ── Estado da máquina de jogo (refs para closures) ────────────────────
  const faseRef        = useRef<Fase>('selecionar');
  const turnoRef       = useRef<1 | 2>(1);
  const selecionadoRef = useRef<string | null>(null);
  const miraInicioRef  = useRef<Vec2 | null>(null);     // posição do botão selecionado
  const miraAtualRef   = useRef<Vec2 | null>(null);     // posição atual do dedo
  const direcaoRef     = useRef<Direcao | null>(null);  // direção travada para o disparo
  const gkDragRef      = useRef(false);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchOriginRef = useRef<Vec2 | null>(null);     // origin em coords de campo

  // ── UI state (apenas para re-render) ─────────────────────────────────
  const [tick, setTick]         = useState(0);
  const [fase, setFaseUI]       = useState<Fase>('selecionar');
  const [turno, setTurnoUI]     = useState<1 | 2>(1);
  const [miraAtual, setMiraUI]  = useState<Vec2 | null>(null);
  const [selecionado, setSelUI] = useState<string | null>(null);
  const [placar, setPlacar]     = useState({ j1: 0, j2: 0 });
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [contadorGK, setCont]   = useState(GK_TIMER);

  const render = useCallback(() => setTick((t) => t + 1), []);

  // helpers que sincronizam ref + UI
  const setFase = (f: Fase) => { faseRef.current = f; setFaseUI(f); };
  const setTurno = (t: 1 | 2) => { turnoRef.current = t; setTurnoUI(t); };
  const setSel = (s: string | null) => { selecionadoRef.current = s; setSelUI(s); };

  // ── Disparar ───────────────────────────────────────────────────────────
  const disparar = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const dir = direcaoRef.current;
    const sel = selecionadoRef.current;
    if (!dir || !sel) { setFase('selecionar'); return; }

    botoesRef.current = botoesRef.current.map((b) =>
      b.id === sel ? { ...b, velocidade: { x: dir.ux * dir.forca, y: dir.uy * dir.forca } } : b
    );
    setSel(null);
    miraInicioRef.current = null;
    miraAtualRef.current  = null;
    setMiraUI(null);
    direcaoRef.current    = null;
    tocouBolaRef.current  = false;
    setFase('animando');
    iniciarLoop();
  }, []);

  // ── Timer do goleiro ───────────────────────────────────────────────────
  const iniciarContagemGK = useCallback(() => {
    setCont(GK_TIMER);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCont((prev) => {
        if (prev <= 1) { disparar(); return GK_TIMER; }
        return prev - 1;
      });
    }, 1000);
  }, [disparar]);

  // ── Game loop ──────────────────────────────────────────────────────────
  const iniciarLoop = useCallback(() => {
    if (rodandoRef.current) return;
    rodandoRef.current = true;

    const loop = () => {
      const res = stepPhysics(botoesRef.current, bolaRef.current);
      botoesRef.current = res.botoes;
      bolaRef.current   = res.bola;
      if (res.tocouBola) tocouBolaRef.current = true;

      if (res.bolaEmGol !== null) {
        rodandoRef.current = false;
        const marcou = res.bolaEmGol as 1 | 2;
        setPlacar((prev) => {
          const n = { ...prev };
          if (marcou === 1) n.j1++; else n.j2++;
          const nome = marcou === 1 ? partida.jogador1.nome : partida.jogador2.nome;
          if ((marcou === 1 ? n.j1 : n.j2) >= partida.golsParaVencer) {
            setTimeout(() => navigation.replace('Resultado', { vencedorId: marcou, nomeVencedor: nome }), 1500);
          } else {
            setMensagem(`⚽  GOL de ${nome}!`);
            setTimeout(() => {
              setMensagem(null);
              bolaRef.current = { posicao: { x: W / 2, y: H / 2 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO_BOLA };
              botoesRef.current = botoesRef.current.map((b) => ({ ...b, velocidade: { x: 0, y: 0 } }));
              setTurno(marcou === 1 ? 2 : 1);
              setFase('selecionar');
              render();
            }, PARTIDA.PAUSA_GOL_MS);
          }
          return n;
        });
        render(); return;
      }

      if (res.faltaDetectada) {
        rodandoRef.current = false;
        const faltoso = res.faltaDetectada.jogadorFaltoso;
        const nome = faltoso === 1 ? partida.jogador1.nome : partida.jogador2.nome;
        setMensagem(`🟨  FALTA de ${nome}!`);
        setTimeout(() => {
          setMensagem(null);
          botoesRef.current = botoesRef.current.map((b) => ({ ...b, velocidade: { x: 0, y: 0 } }));
          bolaRef.current.velocidade = { x: 0, y: 0 };
          setTurno(faltoso === 1 ? 2 : 1);
          setFase('selecionar');
          render();
        }, 1500);
        render(); return;
      }

      render();

      if (tudoParado(botoesRef.current, bolaRef.current)) {
        rodandoRef.current = false;
        if (!tocouBolaRef.current) {
          setMensagem('Não tocou a bola — turno perdido!');
          setTimeout(() => setMensagem(null), 1200);
          setTurno(turnoRef.current === 1 ? 2 : 1);
        }
        tocouBolaRef.current = false;
        setFase('selecionar');
        return;
      }
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => () => {
    if (animRef.current)  cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Lógica de toque ────────────────────────────────────────────────────
  const aoTocar = (tx: number, ty: number) => {
    const f = faseRef.current;
    if (f === 'animando') return;

    if (f === 'ajustar_gk') {
      // O defensor toca no SEU goleiro
      const defId = GK_ID[turnoRef.current === 1 ? 2 : 1];
      const gk    = botoesRef.current.find((b) => b.id === defId);
      if (gk && Math.hypot(gk.posicao.x - tx, gk.posicao.y - ty) < BOTAO.RAIO_GOLEIRO_W * 3.5)
        gkDragRef.current = true;
      return;
    }

    // selecionar / mirar: encontra botão de campo (não goleiro) do turno atual
    const b = botoesRef.current.find((bt) => {
      if (bt.jogadorId !== turnoRef.current || bt.tipo === 'goleiro') return false;
      return Math.hypot(bt.posicao.x - tx, bt.posicao.y - ty) <= bt.raio + 14;
    });

    if (b) {
      setSel(b.id);
      miraInicioRef.current = { x: b.posicao.x, y: b.posicao.y };
      miraAtualRef.current  = { x: tx, y: ty };
      setMiraUI({ x: tx, y: ty });
      setFase('mirar');
    } else if (f === 'mirar') {
      // Clicou fora — cancela
      setSel(null);
      miraInicioRef.current = null;
      miraAtualRef.current  = null;
      setMiraUI(null);
      setFase('selecionar');
    }
  };

  const aoMover = (tx: number, ty: number) => {
    if (faseRef.current === 'mirar') {
      miraAtualRef.current = { x: tx, y: ty };
      setMiraUI({ x: tx, y: ty });
    }

    if (faseRef.current === 'ajustar_gk' && gkDragRef.current) {
      const defId = GK_ID[turnoRef.current === 1 ? 2 : 1];
      const gk    = botoesRef.current.find((b) => b.id === defId);
      if (!gk) return;
      // Goleiro só se move dentro da área do gol (X)
      const limMin = W / 2 - CAMPO.GOL_LARGURA / 2 - BOTAO.RAIO_GOLEIRO_W;
      const limMax = W / 2 + CAMPO.GOL_LARGURA / 2 + BOTAO.RAIO_GOLEIRO_W;
      botoesRef.current = botoesRef.current.map((b) =>
        b.id === defId
          ? { ...b, posicao: { x: Math.max(limMin, Math.min(limMax, tx)), y: gk.posicao.y } }
          : b
      );
      render();
    }
  };

  const aoSoltar = (tx: number, ty: number) => {
    if (faseRef.current === 'mirar') {
      const inicio = miraInicioRef.current;
      const atual  = miraAtualRef.current;
      if (!inicio || !atual || !selecionadoRef.current) { setFase('selecionar'); return; }

      const dx = atual.x - inicio.x;
      const dy = atual.y - inicio.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 8) { setFase('selecionar'); return; }

      const power = Math.min(dist / MAX_DRAG, 1);
      direcaoRef.current = { ux: dx / dist, uy: dy / dist, forca: power * BOTAO.FORCA_MAXIMA, power };
      setFase('ajustar_gk');
      iniciarContagemGK();
    }

    if (faseRef.current === 'ajustar_gk') gkDragRef.current = false;
  };

  // ── PanResponder no campo (captura antes dos filhos) ──────────────────
  const panRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: (evt) => {
        const tx = evt.nativeEvent.locationX;
        const ty = evt.nativeEvent.locationY;
        touchOriginRef.current = { x: tx, y: ty };
        aoTocar(tx, ty);
      },
      onPanResponderMove: (_, gs) => {
        const o = touchOriginRef.current;
        if (!o) return;
        aoMover(o.x + gs.dx, o.y + gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        const o = touchOriginRef.current;
        if (!o) return;
        aoSoltar(o.x + gs.dx, o.y + gs.dy);
        touchOriginRef.current = null;
      },
      onPanResponderTerminate: () => { touchOriginRef.current = null; },
    })
  ).current;

  // ── Calcular seta visual ───────────────────────────────────────────────
  const botaoSel = selecionado ? botoesRef.current.find((b) => b.id === selecionado) : null;

  const calcArrow = (): null | {
    sx: number; sy: number; ex: number; ey: number;
    cor: string; power: number; guias: Vec2[];
    tip1x: number; tip1y: number; tip2x: number; tip2y: number;
  } => {
    const inicio = miraInicioRef.current;
    let ux = 0, uy = 0, power = 0;

    if (fase === 'mirar' && miraAtual && inicio) {
      const dx = miraAtual.x - inicio.x, dy = miraAtual.y - inicio.y;
      const d  = Math.hypot(dx, dy) || 1;
      ux = dx / d; uy = dy / d;
      power = Math.min(d / MAX_DRAG, 1);
    } else if ((fase === 'ajustar_gk') && direcaoRef.current && inicio) {
      ({ ux, uy, power } = direcaoRef.current);
    } else return null;

    const len  = power * MAX_DRAG;
    const sx   = inicio.x, sy = inicio.y;
    const ex   = sx + ux * len, ey = sy + uy * len;
    const cor  = corPower(power);
    const ang  = Math.atan2(uy, ux);
    const as   = 12;
    return {
      sx, sy, ex, ey, cor, power,
      guias: [0.28, 0.55, 0.80].map((t) => ({ x: sx + ux * len * t, y: sy + uy * len * t })),
      tip1x: ex - as * Math.cos(ang - 0.5), tip1y: ey - as * Math.sin(ang - 0.5),
      tip2x: ex - as * Math.cos(ang + 0.5), tip2y: ey - as * Math.sin(ang + 0.5),
    };
  };

  const arrow = calcArrow();

  // GK defensor (destacado na fase de ajuste)
  const defGkId  = GK_ID[turno === 1 ? 2 : 1];
  const atkGkId  = GK_ID[turno];
  const defGK    = fase === 'ajustar_gk' ? botoesRef.current.find((b) => b.id === defGkId) : null;
  const corDef   = turno === 1 ? CORES.JOGADOR_2 : CORES.JOGADOR_1;
  const corAtk   = turno === 1 ? CORES.JOGADOR_1 : CORES.JOGADOR_2;
  const nomeAtk  = turno === 1 ? partida.jogador1.nome : partida.jogador2.nome;
  const nomeDef  = turno === 1 ? partida.jogador2.nome : partida.jogador1.nome;

  const instrucao = () => {
    if (fase === 'animando')   return '…';
    if (fase === 'mirar')      return `${nomeAtk}: arraste para apontar, solte para confirmar`;
    if (fase === 'ajustar_gk') return `${nomeDef}: deslize o goleiro  ←  →`;
    return `${nomeAtk}: segure e arraste um botão`;
  };

  return (
    <View style={styles.container}>
      {/* ── Placar ─────────────────────────────────────────────────── */}
      <View style={styles.placarBar}>
        <View style={styles.placarBloco}>
          <Text style={[styles.placarNome, { color: CORES.JOGADOR_1 }]} numberOfLines={1}>
            {partida.jogador1.nome}
          </Text>
          <Text style={[styles.placarGol, { color: CORES.JOGADOR_1 }]}>{placar.j1}</Text>
        </View>
        <Text style={styles.placarX}>×</Text>
        <View style={[styles.placarBloco, { alignItems: 'flex-end' }]}>
          <Text style={[styles.placarNome, { color: CORES.JOGADOR_2 }]} numberOfLines={1}>
            {partida.jogador2.nome}
          </Text>
          <Text style={[styles.placarGol, { color: CORES.JOGADOR_2 }]}>{placar.j2}</Text>
        </View>
      </View>

      {/* ── Instrução ──────────────────────────────────────────────── */}
      <View style={[
        styles.instrucaoBar,
        fase === 'ajustar_gk' && { backgroundColor: corDef + '28' },
      ]}>
        <Text style={[styles.instrucaoTxt, { color: fase === 'ajustar_gk' ? corDef : corAtk }]} numberOfLines={1}>
          {instrucao()}
        </Text>
        {fase === 'ajustar_gk' && (
          <Text style={[styles.timerTxt, { color: corDef }]}>{contadorGK}s</Text>
        )}
      </View>

      {/* ── Campo (PanResponder captura tudo) ─────────────────────── */}
      <View
        style={[styles.campo, { width: W, height: H }]}
        {...panRef.panHandlers}
      >
        {/* Linhas de campo */}
        <CampoSVG />

        {/* Seta direcional + indicador do GK */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {/* Seta de mira */}
          {arrow && (
            <G opacity={fase === 'ajustar_gk' ? 0.5 : 1}>
              {/* Anel de potência ao redor do botão */}
              {botaoSel && (
                <Circle
                  cx={arrow.sx} cy={arrow.sy}
                  r={botaoSel.raio + 10}
                  stroke={arrow.cor} strokeWidth={2}
                  fill="none" opacity={0.7}
                />
              )}
              {/* Linha tracejada */}
              <Line
                x1={arrow.sx} y1={arrow.sy} x2={arrow.ex} y2={arrow.ey}
                stroke={arrow.cor} strokeWidth={3.5} strokeDasharray="10,7"
              />
              {/* Pontos guia */}
              {arrow.guias.map((g, i) => (
                <Circle key={i} cx={g.x} cy={g.y} r={4} fill={arrow.cor} opacity={0.75} />
              ))}
              {/* Ponta da seta */}
              <Polygon
                points={`${arrow.ex},${arrow.ey} ${arrow.tip1x},${arrow.tip1y} ${arrow.tip2x},${arrow.tip2y}`}
                fill={arrow.cor}
              />
            </G>
          )}

          {/* Highlight do goleiro defensor + setas ← → */}
          {defGK && (
            <G>
              <Ellipse
                cx={defGK.posicao.x} cy={defGK.posicao.y}
                rx={BOTAO.RAIO_GOLEIRO_W + 14} ry={BOTAO.RAIO_GOLEIRO_H + 14}
                stroke={corDef} strokeWidth={2.5} strokeDasharray="7,5"
                fill={corDef + '18'}
              />
              {/* Seta esquerda */}
              <Polygon
                points={`
                  ${defGK.posicao.x - BOTAO.RAIO_GOLEIRO_W - 22},${defGK.posicao.y}
                  ${defGK.posicao.x - BOTAO.RAIO_GOLEIRO_W - 12},${defGK.posicao.y - 6}
                  ${defGK.posicao.x - BOTAO.RAIO_GOLEIRO_W - 12},${defGK.posicao.y + 6}
                `}
                fill={corDef}
              />
              {/* Seta direita */}
              <Polygon
                points={`
                  ${defGK.posicao.x + BOTAO.RAIO_GOLEIRO_W + 22},${defGK.posicao.y}
                  ${defGK.posicao.x + BOTAO.RAIO_GOLEIRO_W + 12},${defGK.posicao.y - 6}
                  ${defGK.posicao.x + BOTAO.RAIO_GOLEIRO_W + 12},${defGK.posicao.y + 6}
                `}
                fill={corDef}
              />
            </G>
          )}
        </Svg>

        {/* ── Botões (pointerEvents none — PanResponder do campo captura) ── */}
        {botoesRef.current.map((b) => {
          const isGk    = b.tipo === 'goleiro';
          const isSel   = b.id === selecionado;
          const isOwn   = b.jogadorId === turno;
          const isDefGK = fase === 'ajustar_gk' && b.id === defGkId;
          const w = isGk ? BOTAO.RAIO_GOLEIRO_W * 2 : b.raio * 2;
          const h = isGk ? BOTAO.RAIO_GOLEIRO_H * 2 : b.raio * 2;
          return (
            <View
              key={b.id}
              pointerEvents="none"
              style={[
                styles.peca,
                {
                  left: b.posicao.x - w / 2,
                  top:  b.posicao.y - h / 2,
                  width: w, height: h,
                  borderRadius:   isGk ? 6 : b.raio,
                  backgroundColor: b.cor,
                  borderWidth:  isSel || isDefGK ? 3 : 1.5,
                  borderColor:  isSel ? CORES.SELECIONADO : isDefGK ? corDef : 'rgba(255,255,255,0.45)',
                  opacity:      fase === 'animando' ? 1 : isOwn ? 1 : 0.65,
                  shadowColor:  isSel ? CORES.SELECIONADO : '#000',
                  shadowOpacity: isSel ? 1 : 0.4,
                  shadowRadius:  isSel ? 12 : 3,
                  elevation:     isSel ? 10 : 3,
                },
              ]}
            />
          );
        })}

        {/* ── Bola ─────────────────────────────────────────────────── */}
        <View
          pointerEvents="none"
          style={[
            styles.bola,
            {
              left:   bolaRef.current.posicao.x - BOTAO.RAIO_BOLA,
              top:    bolaRef.current.posicao.y - BOTAO.RAIO_BOLA,
              width:  BOTAO.RAIO_BOLA * 2,
              height: BOTAO.RAIO_BOLA * 2,
            },
          ]}
        />

        {/* ── Flash de mensagem ────────────────────────────────────── */}
        {mensagem && (
          <View style={styles.flashBox} pointerEvents="none">
            <Text style={styles.flashTxt}>{mensagem}</Text>
          </View>
        )}
      </View>

      {/* ── Rodapé ────────────────────────────────────────────────── */}
      <View style={styles.rodape}>
        {fase === 'ajustar_gk' && (
          <TouchableOpacity
            style={[styles.btnDisparar, { backgroundColor: corAtk }]}
            onPress={disparar}
          >
            <Text style={styles.btnDispararTxt}>DISPARAR  ▶</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.btnPausar}>
          <Text style={styles.btnPausarTxt}>⏸</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center' },

  placarBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', paddingHorizontal: 20, paddingTop: 44, paddingBottom: 8,
    backgroundColor: '#1a1a2e',
  },
  placarBloco:  { flex: 1 },
  placarNome:   { fontSize: 12, fontWeight: '700' },
  placarGol:    { fontSize: 30, fontWeight: '900', lineHeight: 34 },
  placarX:      { color: '#444', fontSize: 20, marginHorizontal: 10 },

  instrucaoBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 5, paddingHorizontal: 16, gap: 8,
    backgroundColor: '#1a1a2e',
  },
  instrucaoTxt: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3, flex: 1, textAlign: 'center' },
  timerTxt:     { fontSize: 18, fontWeight: '900', minWidth: 28, textAlign: 'right' },

  campo: { backgroundColor: CORES.CAMPO, position: 'relative', overflow: 'visible' },

  peca:  { position: 'absolute' },

  bola: {
    position: 'absolute',
    backgroundColor: '#FFFDE7',
    borderRadius: 99,
    borderWidth: 2,
    borderColor: '#555',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 6,
  },

  flashBox: {
    position: 'absolute', top: '38%', left: 0, right: 0,
    alignItems: 'center',
  },
  flashTxt: {
    backgroundColor: 'rgba(0,0,0,0.82)', color: '#FFD700',
    fontSize: 24, fontWeight: '900',
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, overflow: 'hidden',
  },

  rodape: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, paddingHorizontal: 16,
  },
  btnDisparar:    { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 10, minWidth: 170, alignItems: 'center' },
  btnDispararTxt: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  btnPausar:      { padding: 12 },
  btnPausarTxt:   { color: '#444', fontSize: 22 },
});
