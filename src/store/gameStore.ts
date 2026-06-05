import { create } from 'zustand';
import { Partida, EstadoPartida, TurnoJogador } from '../game/entities/types';
import { CAMPO, BOTAO, CORES, PARTIDA } from '../game/constants';

const criarPartidaInicial = (): Partida => ({
  jogador1: { id: 1, nome: 'Jogador 1', cor: CORES.JOGADOR_1, gols: 0, botaoSelecionado: null },
  jogador2: { id: 2, nome: 'Jogador 2', cor: CORES.JOGADOR_2, gols: 0, botaoSelecionado: null },
  bola: {
    posicao: { x: CAMPO.LARGURA / 2, y: CAMPO.ALTURA / 2 },
    velocidade: { x: 0, y: 0 },
    raio: BOTAO.RAIO_BOLA,
  },
  botoes: [
    { id: 'j1-b1', jogadorId: 1, posicao: { x: 80, y: 300 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO, ativo: true, cor: CORES.JOGADOR_1 },
    { id: 'j1-b2', jogadorId: 1, posicao: { x: 80, y: 380 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO, ativo: true, cor: CORES.JOGADOR_1 },
    { id: 'j1-b3', jogadorId: 1, posicao: { x: 80, y: 460 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO, ativo: true, cor: CORES.JOGADOR_1 },
    { id: 'j2-b1', jogadorId: 2, posicao: { x: 280, y: 300 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO, ativo: true, cor: CORES.JOGADOR_2 },
    { id: 'j2-b2', jogadorId: 2, posicao: { x: 280, y: 380 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO, ativo: true, cor: CORES.JOGADOR_2 },
    { id: 'j2-b3', jogadorId: 2, posicao: { x: 280, y: 460 }, velocidade: { x: 0, y: 0 }, raio: BOTAO.RAIO, ativo: true, cor: CORES.JOGADOR_2 },
  ],
  campo: {
    largura: CAMPO.LARGURA,
    altura: CAMPO.ALTURA,
    gol1: { x: 0, y: CAMPO.ALTURA / 2 - CAMPO.GOL_LARGURA / 2, largura: CAMPO.GOL_ALTURA, altura: CAMPO.GOL_LARGURA, jogadorId: 1 },
    gol2: { x: CAMPO.LARGURA - CAMPO.GOL_ALTURA, y: CAMPO.ALTURA / 2 - CAMPO.GOL_LARGURA / 2, largura: CAMPO.GOL_ALTURA, altura: CAMPO.GOL_LARGURA, jogadorId: 2 },
  },
  turnoAtual: 1,
  estado: 'menu',
  rodada: 1,
  golsParaVencer: PARTIDA.GOLS_PARA_VENCER,
});

interface GameStore {
  partida: Partida;
  setEstado: (estado: EstadoPartida) => void;
  setTurno: (turno: TurnoJogador) => void;
  marcarGol: (jogadorId: 1 | 2) => void;
  resetarPartida: () => void;
  setNomeJogador: (jogadorId: 1 | 2, nome: string) => void;
}

export const useGameStore = create<GameStore>((set) => ({
  partida: criarPartidaInicial(),
  setEstado: (estado) =>
    set((s) => ({ partida: { ...s.partida, estado } })),
  setTurno: (turnoAtual) =>
    set((s) => ({ partida: { ...s.partida, turnoAtual } })),
  marcarGol: (jogadorId) =>
    set((s) => {
      const partida = { ...s.partida };
      if (jogadorId === 1) partida.jogador1 = { ...partida.jogador1, gols: partida.jogador1.gols + 1 };
      else partida.jogador2 = { ...partida.jogador2, gols: partida.jogador2.gols + 1 };
      const venceu = jogadorId === 1
        ? partida.jogador1.gols >= partida.golsParaVencer
        : partida.jogador2.gols >= partida.golsParaVencer;
      return { partida: { ...partida, estado: venceu ? 'fim' : 'gol' } };
    }),
  resetarPartida: () => set({ partida: criarPartidaInicial() }),
  setNomeJogador: (jogadorId, nome) =>
    set((s) => {
      const partida = { ...s.partida };
      if (jogadorId === 1) partida.jogador1 = { ...partida.jogador1, nome };
      else partida.jogador2 = { ...partida.jogador2, nome };
      return { partida };
    }),
}));
