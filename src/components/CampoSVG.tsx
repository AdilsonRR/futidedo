import React from 'react';
import Svg, { Rect, Line, Circle, Ellipse } from 'react-native-svg';
import { CAMPO, CORES } from '../game/constants';

const W = CAMPO.LARGURA;
const H = CAMPO.ALTURA;
const cx = W / 2;
const cy = H / 2;
const L = CORES.LINHA;
const SW = 1.5; // strokeWidth

const gL = cx - CAMPO.GOL_LARGURA / 2;
const gR = cx + CAMPO.GOL_LARGURA / 2;
const gP = CAMPO.GOL_PROFUNDIDADE;

// Área penal
const apW = CAMPO.AREA_PENAL_LARGURA;
const apH = CAMPO.AREA_PENAL_ALTURA;
const apX = cx - apW / 2;

// Área do goleiro
const agW = CAMPO.AREA_GOL_LARGURA;
const agH = CAMPO.AREA_GOL_ALTURA;
const agX = cx - agW / 2;

export default function CampoSVG() {
  return (
    <Svg width={W} height={H} style={{ position: 'absolute', top: 0, left: 0 }}>
      {/* Fundo xadrez (variação de verde) */}
      {Array.from({ length: 8 }).map((_, i) => (
        <Rect
          key={i}
          x={0}
          y={(H / 8) * i}
          width={W}
          height={H / 8}
          fill={i % 2 === 0 ? CORES.CAMPO : CORES.CAMPO_CLARO}
          opacity={0.6}
        />
      ))}

      {/* Linha de fundo J2 (topo) */}
      <Line x1={0} y1={0} x2={W} y2={0} stroke={L} strokeWidth={SW * 2} />
      {/* Linha de fundo J1 (baixo) */}
      <Line x1={0} y1={H} x2={W} y2={H} stroke={L} strokeWidth={SW * 2} />
      {/* Laterais */}
      <Line x1={0} y1={0} x2={0} y2={H} stroke={L} strokeWidth={SW * 2} />
      <Line x1={W} y1={0} x2={W} y2={H} stroke={L} strokeWidth={SW * 2} />

      {/* Linha do meio */}
      <Line x1={0} y1={cy} x2={W} y2={cy} stroke={L} strokeWidth={SW} />

      {/* Círculo central */}
      <Circle cx={cx} cy={cy} r={CAMPO.CIRCULO_RAIO} stroke={L} strokeWidth={SW} fill="none" />
      <Circle cx={cx} cy={cy} r={3} fill={L} />

      {/* Gol J2 (topo) — fundo */}
      <Rect x={gL} y={-gP} width={CAMPO.GOL_LARGURA} height={gP} fill={CORES.GOL_BG} stroke={L} strokeWidth={SW} />
      {/* Área do goleiro J2 */}
      <Rect x={agX} y={0} width={agW} height={agH} fill="none" stroke={L} strokeWidth={SW} />
      {/* Área penal J2 */}
      <Rect x={apX} y={0} width={apW} height={apH} fill="none" stroke={L} strokeWidth={SW} />

      {/* Gol J1 (baixo) — fundo */}
      <Rect x={gL} y={H} width={CAMPO.GOL_LARGURA} height={gP} fill={CORES.GOL_BG} stroke={L} strokeWidth={SW} />
      {/* Área do goleiro J1 */}
      <Rect x={agX} y={H - agH} width={agW} height={agH} fill="none" stroke={L} strokeWidth={SW} />
      {/* Área penal J1 */}
      <Rect x={apX} y={H - apH} width={apW} height={apH} fill="none" stroke={L} strokeWidth={SW} />

      {/* Ponto do pênalti J2 */}
      <Circle cx={cx} cy={70} r={3} fill={L} />
      {/* Ponto do pênalti J1 */}
      <Circle cx={cx} cy={H - 70} r={3} fill={L} />

      {/* Ponto central (chute inicial) */}
      <Circle cx={cx} cy={cy} r={3} fill={L} />
    </Svg>
  );
}
