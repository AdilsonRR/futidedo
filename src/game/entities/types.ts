export interface Vec2 {
  x: number;
  y: number;
}

export interface Botao {
  id: string;
  jogadorId: 1 | 2;
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
  x: number;
  y: number;
  largura: number;
  altura: number;
  jogadorId: 1 | 2;
}

export interface Campo {
  largura: number;
  altura: number;
  gol1: Gol;
  gol2: Gol;
}

export interface Jogador {
  id: 1 | 2;
  nome: string;
  cor: string;
  gols: number;
  botaoSelecionado: string | null;
}

export type EstadoPartida = 'menu' | 'selecao' | 'jogando' | 'gol' | 'fim';
export type TurnoJogador = 1 | 2;

export interface Partida {
  jogador1: Jogador;
  jogador2: Jogador;
  bola: Bola;
  botoes: Botao[];
  campo: Campo;
  turnoAtual: TurnoJogador;
  estado: EstadoPartida;
  rodada: number;
  golsParaVencer: number;
}
