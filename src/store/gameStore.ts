import { create } from 'zustand';
import { Partida, EstadoPartida, TurnoJogador, Botao, Falta } from '../game/entities/types';
import { CAMPO, BOTAO, CORES, PARTIDA, posicoes11Jogador } from '../game/constants';

function criar11Botoes(jogadorId: 1 | 2): Botao[] {
  const cor = jogadorId === 1 ? CORES.JOGADOR_1 : CORES.JOGADOR_2;
  const corGk = jogadorId === 1 ? CORES.GOLEIRO_1 : CORES.GOLEIRO_2;
  const posicoes = posicoes11Jogador(jogadorId, CAMPO.LARGURA, CAMPO.ALTURA);
  return posicoes.map((p, i) => ({
    id: `j${jogadorId}-b${i}`,
    jogadorId,
    tipo: i === 0 ? 'goleiro' : 'campo',
    posicao: { x: p.x, y: p.y },
    velocidade: { x: 0, y: 0 },
    raio: i === 0 ? BOTAO.RAIO_GOLEIRO_W : BOTAO.RAIO,
    ativo: true,
    cor: i === 0 ? corGk : cor,
  }));
}

const criarPartidaInicial = (nomes?: { j1: string; j2: string }): Partida => ({
  jogador1: { id: 1, nome: nomes?.j1 ?? 'Jogador 1', cor: CORES.JOGADOR_1, gols: 0 },
  jogador2: { id: 2, nome: nomes?.j2 ?? 'Jogador 2', cor: CORES.JOGADOR_2, gols: 0 },
  bola: {
    posicao: { x: CAMPO.LARGURA / 2, y: CAMPO.ALTURA / 2 },
    velocidade: { x: 0, y: 0 },
    raio: BOTAO.RAIO_BOLA,
  },
  botoes: [...criar11Botoes(1), ...criar11Botoes(2)],
  turnoAtual: 1,
  estado: 'jogando',
  golsParaVencer: PARTIDA.GOLS_PARA_VENCER,
  faltaAtual: null,
  tocouBola: false,
});

interface GameStore {
  partida: Partida;
  nomes: { j1: string; j2: string };
  setNomes: (j1: string, j2: string) => void;
  setEstado: (estado: EstadoPartida) => void;
  setTurno: (turno: TurnoJogador) => void;
  marcarGol: (quemMarcou: 1 | 2) => void;
  registrarFalta: (falta: Falta) => void;
  resetarPartida: () => void;
  atualizarFisica: (botoes: Botao[], bola: Partida['bola'], tocouBola: boolean) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  partida: criarPartidaInicial(),
  nomes: { j1: 'Jogador 1', j2: 'Jogador 2' },

  setNomes: (j1, j2) => {
    set({ nomes: { j1, j2 } });
    set((s) => ({
      partida: {
        ...s.partida,
        jogador1: { ...s.partida.jogador1, nome: j1 },
        jogador2: { ...s.partida.jogador2, nome: j2 },
      },
    }));
  },

  setEstado: (estado) =>
    set((s) => ({ partida: { ...s.partida, estado } })),

  setTurno: (turnoAtual) =>
    set((s) => ({ partida: { ...s.partida, turnoAtual, tocouBola: false } })),

  marcarGol: (quemMarcou) =>
    set((s) => {
      const p = { ...s.partida };
      if (quemMarcou === 1) p.jogador1 = { ...p.jogador1, gols: p.jogador1.gols + 1 };
      else p.jogador2 = { ...p.jogador2, gols: p.jogador2.gols + 1 };
      const fim = p.jogador1.gols >= p.golsParaVencer || p.jogador2.gols >= p.golsParaVencer;
      return { partida: { ...p, estado: fim ? 'fim' : 'gol', faltaAtual: null } };
    }),

  registrarFalta: (faltaAtual) =>
    set((s) => ({ partida: { ...s.partida, estado: 'falta', faltaAtual } })),

  atualizarFisica: (botoes, bola, tocouBola) =>
    set((s) => ({ partida: { ...s.partida, botoes, bola, tocouBola } })),

  resetarPartida: () => {
    const { nomes } = get();
    set({ partida: criarPartidaInicial(nomes) });
  },
}));
