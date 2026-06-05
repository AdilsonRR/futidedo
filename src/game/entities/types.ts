export interface Vec2 { x: number; y: number }

export type TipoBotao = 'campo' | 'goleiro';
export type EstadoPartida = 'jogando' | 'animando' | 'gol' | 'falta' | 'fim';
export type TurnoJogador = 1 | 2;

export interface Botao {
  id: string;
  jogadorId: 1 | 2;
  tipo: TipoBotao;
  posicao: Vec2;
  velocidade: Vec2;
  raio: number;
  ativo: boolean;
  cor: string;
}

export interface Bola {
  posicao: Vec2;
  velocidade: Vec2;
  raio: number;
}

export interface Gol {
  x: number;      // centro x do gol
  y: number;      // y da linha do gol
  largura: number;
  profundidade: number;
  jogadorId: 1 | 2;
}

export interface Falta {
  posicao: Vec2;
  jogadorFaltoso: 1 | 2;
}

export interface Jogador {
  id: 1 | 2;
  nome: string;
  cor: string;
  gols: number;
}

export interface Partida {
  jogador1: Jogador;
  jogador2: Jogador;
  bola: Bola;
  botoes: Botao[];
  turnoAtual: TurnoJogador;
  estado: EstadoPartida;
  golsParaVencer: number;
  faltaAtual: Falta | null;
  tocouBola: boolean;  // se o botão atirado tocou a bola neste lance
}
