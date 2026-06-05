import { Dimensions } from 'react-native';

const SCREEN = Dimensions.get('window');

// Campo vertical: largura = tela, altura = 85% da tela
export const CAMPO = {
  LARGURA: SCREEN.width - 16,
  ALTURA: SCREEN.height * 0.72,
  GOL_LARGURA: 70,   // abertura do gol (horizontal)
  GOL_PROFUNDIDADE: 16,
  AREA_PENAL_LARGURA: 160,
  AREA_PENAL_ALTURA: 90,
  AREA_GOL_LARGURA: 90,
  AREA_GOL_ALTURA: 40,
  CIRCULO_RAIO: 50,
  MARGEM_LINHA: 8,
};

export const BOTAO = {
  RAIO: 18,
  RAIO_GOLEIRO_W: 22,   // goleiro é oval: mais largo
  RAIO_GOLEIRO_H: 14,
  RAIO_BOLA: 10,
  FORCA_MAXIMA: 18,
  FORCA_FALTA: 14,      // velocidade de impacto que gera falta
  FRICCAO: 0.88,        // multiplicador por frame (1 = sem friccao)
  RESTITUICAO: 0.55,
};

export const PARTIDA = {
  GOLS_PARA_VENCER: 3,
  MAX_ROUNDS: 10,
  PAUSA_GOL_MS: 2000,
};

export const CORES = {
  JOGADOR_1: '#E63946',
  JOGADOR_1_CLARO: '#FF6B74',
  JOGADOR_2: '#1565C0',
  JOGADOR_2_CLARO: '#42A5F5',
  BOLA: '#FFFDE7',
  CAMPO: '#2E7D32',
  CAMPO_CLARO: '#388E3C',
  LINHA: 'rgba(255,255,255,0.85)',
  LINHA_FRACA: 'rgba(255,255,255,0.3)',
  GOL_BG: 'rgba(255,255,255,0.15)',
  FALTA: '#FF9800',
  SELECIONADO: '#FFD700',
  GOLEIRO_1: '#B71C1C',
  GOLEIRO_2: '#0D47A1',
};

// Posições iniciais dos 11 botões por jogador no campo vertical
// J1 = lado de baixo, J2 = lado de cima
export function posicoes11Jogador(jogadorId: 1 | 2, largura: number, altura: number) {
  const cx = largura / 2;
  const yBase = jogadorId === 1 ? altura - 30 : 30;
  const dir = jogadorId === 1 ? -1 : 1; // direção de avanço

  // Formação 1-4-3-3 adaptada ao campo vertical
  return [
    // Goleiro
    { col: 0, x: cx, y: yBase },
    // Zagueiros (4)
    { col: 1, x: cx - 108, y: yBase + dir * 70 },
    { col: 1, x: cx - 36,  y: yBase + dir * 70 },
    { col: 1, x: cx + 36,  y: yBase + dir * 70 },
    { col: 1, x: cx + 108, y: yBase + dir * 70 },
    // Meias (3)
    { col: 2, x: cx - 72, y: yBase + dir * 145 },
    { col: 2, x: cx,      y: yBase + dir * 145 },
    { col: 2, x: cx + 72, y: yBase + dir * 145 },
    // Atacantes (3)
    { col: 3, x: cx - 72, y: yBase + dir * 215 },
    { col: 3, x: cx,      y: yBase + dir * 215 },
    { col: 3, x: cx + 72, y: yBase + dir * 215 },
  ];
}
