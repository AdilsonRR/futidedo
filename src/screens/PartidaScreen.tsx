import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Line, Circle, Polygon, G } from 'react-native-svg';
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

const W = CAMPO.LARGURA;
const H = CAMPO.ALTURA;
const MAX_DRAG = 110; // px = força máxima
const GK_TIMER = 4;  // segundos para ajustar goleiro

// Y fixo dos goleiros (mesmos definidos em posicoes11Jogador)
const GK_Y: Record<1 | 2, number> = { 1: H - 30, 2: 30 };

function corPorPotencia(p: number) {
  if (p < 0.4) return '#4CAF50';
  if (p < 0.75) return '#FFD700';
  return '#E63946';
}

export default function PartidaScreen({ navigation }: Props) {
  const { partida } = useGameStore();

  // ── Física em refs (sem re-render por frame) ──────────────────────────
  const botoesRef = useRef<Botao[]>(partida.botoes.map((b) => ({ ...b })));
  const bolaRef   = useRef({ ...partida.bola });
  const animRef   = useRef<number | null>(null);
  const rodandoRef = useRef(false);
  const tocouBolaRef = useRef(false);

  // ── Máquina de estados ────────────────────────────────────────────────
  const faseRef       = useRef<Fase>('selecionar');
  const selecionadoRef = useRef<string | null>(null);
  const miraInicioRef  = useRef<Vec2 | null>(null);
  const miraAtualRef   = useRef<Vec2 | null>(null);
  const direcaoRef     = useRef<Direcao | null>(null);
  const turnoRef       = useRef<1 | 2>(1);
  const gkDragRef      = useRef(false);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Estado de UI ──────────────────────────────────────────────────────
  const [tick, setTick]               = useState(0);        // força re-render
  const [fase, setFaseUI]             = useState<Fase>('selecionar');
  const [turno, setTurnoUI]           = useState<1 | 2>(1);
  const [miraAtual, setMiraAtualUI]   = useState<Vec2 | null>(null);
  const [selecionado, setSelecionadoUI] = useState<string | null>(null);
  const [placar, setPlacar]           = useState({ j1: 0, j2: 0 });
  const [mensagem, setMensagem]       = useState<string | null>(null);
  const [contadorGK, setContadorGK]   = useState(GK_TIMER);

  const render = () => setTick((t) => t + 1);

  // ── Helpers de estado (sincroniza ref + UI) ───────────────────────────
  const setFase = (f: Fase) => { faseRef.current = f; setFaseUI(f); };
  const setTurno = (t: 1 | 2) => { turnoRef.current = t; setTurnoUI(t); };
  const setSelecionado = (s: string | null) => { selecionadoRef.current = s; setSelecionadoUI(s); };

  // ── Disparar após ajuste do GK ─────────────────────────────────────────
  const disparar = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    const dir = direcaoRef.current;
    const sel = selecionadoRef.current;
    if (!dir || !sel) { setFase('selecionar'); return; }

    botoesRef.current = botoesRef.current.map((b) =>
      b.id === sel ? { ...b, velocidade: { x: dir.ux * dir.forca, y: dir.uy * dir.forca } } : b
    );
    setSelecionado(null);
    miraInicioRef.current = null;
    miraAtualRef.current = null;
    setMiraAtualUI(null);
    direcaoRef.current = null;
    tocouBolaRef.current = false;
    setFase('animando');
    iniciarLoop();
  }, []);

  // ── Contador GK ───────────────────────────────────────────────────────
  const iniciarContagemGK = useCallback(() => {
    setContadorGK(GK_TIMER);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setContadorGK((prev) => {
        if (prev <= 1) { disparar(); return GK_TIMER; }
        return prev - 1;
      });
    }, 1000);
  }, [disparar]);

  // ── Game loop ─────────────────────────────────────────────────────────
  const iniciarLoop = useCallback(() => {
    if (rodandoRef.current) return;
    rodandoRef.current = true;

    const loop = () => {
      const res = stepPhysics(botoesRef.current, bolaRef.current);
      botoesRef.current = res.botoes;
      bolaRef.current   = res.bola;
      if (res.tocouBola) tocouBolaRef.current = true;

      // Gol
      if (res.bolaEmGol !== null) {
        rodandoRef.current = false;
        const marcou = res.bolaEmGol as 1 | 2;
        setPlacar((prev) => {
          const n = { ...prev };
          if (marcou === 1) n.j1++;
          else n.j2++;
          const nomeVencedor = marcou === 1 ? partida.jogador1.nome : partida.jogador2.nome;
          if ((marcou === 1 ? n.j1 : n.j2) >= partida.golsParaVencer) {
            setTimeout(() => navigation.replace('Resultado', { vencedorId: marcou, nomeVencedor }), 1500);
          } else {
            setMensagem(`⚽  GOL de ${nomeVencedor}!`);
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
        render();
        return;
      }

      // Falta
      if (res.faltaDetectada) {
        rodandoRef.current = false;
        const faltoso = res.faltaDetectada.jogadorFaltoso;
        const nome = faltoso === 1 ? partida.jogador1.nome : partida.jogador2.nome;
        setMensagem(`🟨 FALTA de ${nome}!`);
        setTimeout(() => {
          setMensagem(null);
          botoesRef.current = botoesRef.current.map((b) => ({ ...b, velocidade: { x: 0, y: 0 } }));
          bolaRef.current.velocidade = { x: 0, y: 0 };
          setTurno(faltoso === 1 ? 2 : 1);
          setFase('selecionar');
          render();
        }, 1500);
        render();
        return;
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
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  // ── Touch handlers ────────────────────────────────────────────────────
  const handleTouchStart = (tx: number, ty: number) => {
    const f = faseRef.current;
    if (f === 'animando') return;

    if (f === 'ajustar_gk') {
      const defGkId = `j${turnoRef.current === 1 ? 2 : 1}-b0`;
      const gk = botoesRef.current.find((b) => b.id === defGkId);
      if (gk) {
        const d = Math.hypot(gk.posicao.x - tx, gk.posicao.y - ty);
        if (d < BOTAO.RAIO_GOLEIRO_W * 3) gkDragRef.current = true;
      }
      return;
    }

    if (f === 'selecionar' || f === 'mirar') {
      // Encontra botão de campo (não goleiro) do jogador atual
      const b = botoesRef.current.find((bt) => {
        if (bt.jogadorId !== turnoRef.current || bt.tipo === 'goleiro') return false;
        return Math.hypot(bt.posicao.x - tx, bt.posicao.y - ty) <= bt.raio + 12;
      });
      if (b) {
        setSelecionado(b.id);
        miraInicioRef.current = { x: b.posicao.x, y: b.posicao.y };
        miraAtualRef.current  = { x: tx, y: ty };
        setMiraAtualUI({ x: tx, y: ty });
        setFase('mirar');
      }
    }
  };

  const handleTouchMove = (tx: number, ty: number) => {
    if (faseRef.current === 'mirar') {
      miraAtualRef.current = { x: tx, y: ty };
      setMiraAtualUI({ x: tx, y: ty });
    }

    if (faseRef.current === 'ajustar_gk' && gkDragRef.current) {
      const defGkId = `j${turnoRef.current === 1 ? 2 : 1}-b0`;
      const gk = botoesRef.current.find((b) => b.id === defGkId);
      if (!gk) return;
      const margem = BOTAO.RAIO_GOLEIRO_W * 2.5;
      const minX = W / 2 - CAMPO.GOL_LARGURA / 2 - margem;
      const maxX = W / 2 + CAMPO.GOL_LARGURA / 2 + margem;
      const newX = Math.max(minX, Math.min(maxX, tx));
      botoesRef.current = botoesRef.current.map((b) =>
        b.id === defGkId ? { ...b, posicao: { x: newX, y: gk.posicao.y } } : b
      );
      render();
    }
  };

  const handleTouchEnd = (tx: number, ty: number) => {
    if (faseRef.current === 'mirar') {
      const inicio = miraInicioRef.current;
      const atual  = miraAtualRef.current;
      if (!inicio || !atual || !selecionadoRef.current) { setFase('selecionar'); return; }

      const dx = atual.x - inicio.x;
      const dy = atual.y - inicio.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 10) { setFase('selecionar'); return; } // toque sem arrastar

      const power  = Math.min(dist / MAX_DRAG, 1);
      const forca  = power * BOTAO.FORCA_MAXIMA;
      direcaoRef.current = { ux: dx / dist, uy: dy / dist, forca, power };
      setFase('ajustar_gk');
      iniciarContagemGK();
    }

    if (faseRef.current === 'ajustar_gk') {
      gkDragRef.current = false;
    }
  };

  // ── Mira (paleta direcional) ──────────────────────────────────────────
  const botaoSel = selecionado ? botoesRef.current.find((b) => b.id === selecionado) : null;

  const calcArrow = () => {
    const inicio = miraInicioRef.current ?? botaoSel?.posicao;
    const dir    = direcaoRef.current;
    if (!inicio) return null;

    let ux: number, uy: number, power: number;
    if (fase === 'mirar' && miraAtual) {
      const dx = miraAtual.x - inicio.x, dy = miraAtual.y - inicio.y;
      const dist = Math.hypot(dx, dy) || 1;
      ux = dx / dist; uy = dy / dist;
      power = Math.min(dist / MAX_DRAG, 1);
    } else if (fase === 'ajustar_gk' && dir) {
      ux = dir.ux; uy = dir.uy; power = dir.power;
    } else return null;

    const len   = power * MAX_DRAG;
    const endX  = inicio.x + ux * len;
    const endY  = inicio.y + uy * len;
    const cor   = corPorPotencia(power);
    // Ponta da seta (triângulo)
    const angle = Math.atan2(uy, ux);
    const aSize = 10;
    const tip1X = endX - aSize * Math.cos(angle - 0.5);
    const tip1Y = endY - aSize * Math.sin(angle - 0.5);
    const tip2X = endX - aSize * Math.cos(angle + 0.5);
    const tip2Y = endY - aSize * Math.sin(angle + 0.5);

    // Pontos de guia ao longo da linha
    const guias = [0.3, 0.55, 0.8].map((t) => ({
      x: inicio.x + ux * len * t,
      y: inicio.y + uy * len * t,
    }));

    return { inicio, endX, endY, cor, tip1X, tip1Y, tip2X, tip2Y, guias, power, ux, uy, len };
  };

  const arrow = calcArrow();

  // GK defensor (para highlight na fase ajustar_gk)
  const defGkId = `j${turno === 1 ? 2 : 1}-b0`;
  const defGk   = fase === 'ajustar_gk'
    ? botoesRef.current.find((b) => b.id === defGkId)
    : null;

  const jogadorAtual = turno === 1 ? partida.jogador1 : partida.jogador2;
  const corTurno     = turno === 1 ? CORES.JOGADOR_1 : CORES.JOGADOR_2;
  const corDefensor  = turno === 1 ? CORES.JOGADOR_2 : CORES.JOGADOR_1;

  const instrucao = () => {
    if (fase === 'animando')   return '…';
    if (fase === 'mirar')      return 'Arraste para apontar — solte para confirmar';
    if (fase === 'ajustar_gk') return `${turno === 1 ? partida.jogador2.nome : partida.jogador1.nome}: deslize o goleiro!`;
    return `Vez de ${jogadorAtual.nome} — toque em um botão`;
  };

  return (
    <View style={styles.container}>
      {/* ── Placar ── */}
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

      {/* ── Instrução ── */}
      <View style={[styles.instrucaoBar, { backgroundColor: fase === 'ajustar_gk' ? corDefensor + '33' : '#1a1a2e' }]}>
        <Text style={[styles.instrucaoTexto, { color: fase === 'ajustar_gk' ? corDefensor : corTurno }]}>
          {instrucao()}
        </Text>
        {fase === 'ajustar_gk' && (
          <Text style={[styles.contador, { color: corDefensor }]}>{contadorGK}s</Text>
        )}
      </View>

      {/* ── Campo ── */}
      <View
        style={[styles.campo, { width: W, height: H }]}
        onTouchStart={(e) => handleTouchStart(e.nativeEvent.locationX, e.nativeEvent.locationY)}
        onTouchMove={(e)  => handleTouchMove(e.nativeEvent.locationX,  e.nativeEvent.locationY)}
        onTouchEnd={(e)   => handleTouchEnd(e.nativeEvent.locationX,   e.nativeEvent.locationY)}
      >
        <CampoSVG />

        {/* ── Paleta direcional (SVG overlay) ── */}
        <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
          {arrow && (
            <G opacity={fase === 'ajustar_gk' ? 0.55 : 1}>
              {/* Linha tracejada */}
              <Line
                x1={arrow.inicio.x} y1={arrow.inicio.y}
                x2={arrow.endX}     y2={arrow.endY}
                stroke={arrow.cor} strokeWidth={3}
                strokeDasharray="10,6"
              />
              {/* Pontos guia ao longo do trajeto */}
              {arrow.guias.map((g, i) => (
                <Circle key={i} cx={g.x} cy={g.y} r={3.5} fill={arrow.cor} opacity={0.7} />
              ))}
              {/* Ponta da seta */}
              <Polygon
                points={`${arrow.endX},${arrow.endY} ${arrow.tip1X},${arrow.tip1Y} ${arrow.tip2X},${arrow.tip2Y}`}
                fill={arrow.cor}
              />
              {/* Círculo de potência ao redor do botão selecionado */}
              {botaoSel && (
                <Circle
                  cx={arrow.inicio.x} cy={arrow.inicio.y}
                  r={botaoSel.raio + 8}
                  stroke={arrow.cor} strokeWidth={2}
                  fill="none" opacity={0.6}
                />
              )}
            </G>
          )}

          {/* Highlight do GK defensor durante ajuste */}
          {defGk && (
            <>
              <Circle
                cx={defGk.posicao.x} cy={defGk.posicao.y}
                r={BOTAO.RAIO_GOLEIRO_W + 10}
                stroke={corDefensor} strokeWidth={2.5}
                strokeDasharray="6,4"
                fill="none"
              />
              {/* Setas ← → mostrando que pode arrastar */}
              <Line
                x1={defGk.posicao.x - BOTAO.RAIO_GOLEIRO_W - 18} y1={defGk.posicao.y}
                x2={defGk.posicao.x + BOTAO.RAIO_GOLEIRO_W + 18} y2={defGk.posicao.y}
                stroke={corDefensor} strokeWidth={2} opacity={0.8}
              />
              {/* Ponta esquerda */}
              <Polygon
                points={`${defGk.posicao.x - BOTAO.RAIO_GOLEIRO_W - 18},${defGk.posicao.y} ${defGk.posicao.x - BOTAO.RAIO_GOLEIRO_W - 10},${defGk.posicao.y - 5} ${defGk.posicao.x - BOTAO.RAIO_GOLEIRO_W - 10},${defGk.posicao.y + 5}`}
                fill={corDefensor} opacity={0.8}
              />
              {/* Ponta direita */}
              <Polygon
                points={`${defGk.posicao.x + BOTAO.RAIO_GOLEIRO_W + 18},${defGk.posicao.y} ${defGk.posicao.x + BOTAO.RAIO_GOLEIRO_W + 10},${defGk.posicao.y - 5} ${defGk.posicao.x + BOTAO.RAIO_GOLEIRO_W + 10},${defGk.posicao.y + 5}`}
                fill={corDefensor} opacity={0.8}
              />
            </>
          )}
        </Svg>

        {/* ── Botões ── */}
        {botoesRef.current.map((b) => {
          const isGk  = b.tipo === 'goleiro';
          const isSel = b.id === selecionado;
          const isDefGk = fase === 'ajustar_gk' && b.id === defGkId;
          const w = isGk ? BOTAO.RAIO_GOLEIRO_W * 2 : b.raio * 2;
          const h = isGk ? BOTAO.RAIO_GOLEIRO_H * 2 : b.raio * 2;
          return (
            <View
              key={b.id}
              style={[
                styles.botao,
                {
                  left: b.posicao.x - w / 2,
                  top:  b.posicao.y - h / 2,
                  width: w, height: h,
                  borderRadius: isGk ? 5 : b.raio,
                  backgroundColor: b.cor,
                  borderWidth:  isSel || isDefGk ? 3 : 1.5,
                  borderColor:  isSel ? CORES.SELECIONADO : isDefGk ? corDefensor : 'rgba(255,255,255,0.45)',
                  shadowColor:  isSel ? CORES.SELECIONADO : isDefGk ? corDefensor : '#000',
                  shadowOpacity: (isSel || isDefGk) ? 0.9 : 0.35,
                  shadowRadius:  (isSel || isDefGk) ? 10 : 3,
                  elevation:     (isSel || isDefGk) ? 8 : 3,
                  opacity: fase === 'animando' ? 1 : b.jogadorId !== turno && fase !== 'ajustar_gk' ? 0.7 : 1,
                },
              ]}
            />
          );
        })}

        {/* ── Bola ── */}
        <View
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

        {/* ── Mensagem flash ── */}
        {mensagem && (
          <View style={styles.flashOverlay}>
            <Text style={styles.flashTexto}>{mensagem}</Text>
          </View>
        )}
      </View>

      {/* ── Rodapé ── */}
      <View style={styles.rodape}>
        {fase === 'ajustar_gk' && (
          <TouchableOpacity style={[styles.btnDisparar, { backgroundColor: corTurno }]} onPress={disparar}>
            <Text style={styles.btnDispararTexto}>DISPARAR  ▶</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => navigation.navigate('Home')} style={styles.btnPausar}>
          <Text style={styles.btnPausarTexto}>⏸</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0d0d1a', alignItems: 'center' },
  placarBar:    {
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
  },
  instrucaoTexto: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4, flex: 1, textAlign: 'center' },
  contador:       { fontSize: 18, fontWeight: '900', minWidth: 28, textAlign: 'right' },
  campo:          { backgroundColor: CORES.CAMPO, position: 'relative', overflow: 'visible' },
  botao:          { position: 'absolute' },
  bola: {
    position: 'absolute',
    backgroundColor: '#FFFDE7',
    borderRadius: 99,
    borderWidth: 1.5,
    borderColor: '#555',
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 4,
    elevation: 5,
  },
  flashOverlay: {
    position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center',
  },
  flashTexto: {
    backgroundColor: 'rgba(0,0,0,0.8)', color: '#FFD700',
    fontSize: 24, fontWeight: '900',
    paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14, overflow: 'hidden',
  },
  rodape: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 20, paddingHorizontal: 16,
  },
  btnDisparar: {
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 10, minWidth: 160, alignItems: 'center',
  },
  btnDispararTexto: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 },
  btnPausar:        { padding: 10 },
  btnPausarTexto:   { color: '#444', fontSize: 20 },
});
