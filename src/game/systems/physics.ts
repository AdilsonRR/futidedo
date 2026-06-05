import { Botao, Bola, Vec2 } from '../entities/types';
import { CAMPO, BOTAO } from '../constants';

export function dist(a: Vec2, b: Vec2) {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function speed(v: Vec2) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

// Reflect velocity against a wall normal
function reflectX(v: Vec2): Vec2 { return { x: -v.x * BOTAO.RESTITUICAO, y: v.y }; }
function reflectY(v: Vec2): Vec2 { return { x: v.x, y: -v.y * BOTAO.RESTITUICAO }; }

function clampToCampo(pos: Vec2, raio: number, vel: Vec2): { pos: Vec2; vel: Vec2 } {
  let { x, y } = pos;
  let vx = vel.x, vy = vel.y;
  if (x - raio < 0)              { x = raio;                   vx = Math.abs(vx) * BOTAO.RESTITUICAO; }
  if (x + raio > CAMPO.LARGURA)  { x = CAMPO.LARGURA - raio;  vx = -Math.abs(vx) * BOTAO.RESTITUICAO; }
  if (y - raio < 0)              { y = raio;                   vy = Math.abs(vy) * BOTAO.RESTITUICAO; }
  if (y + raio > CAMPO.ALTURA)   { y = CAMPO.ALTURA - raio;   vy = -Math.abs(vy) * BOTAO.RESTITUICAO; }
  return { pos: { x, y }, vel: { x: vx, y: vy } };
}

// Circle-circle elastic impulse collision
export function resolveCircleCollision(
  posA: Vec2, velA: Vec2, massA: number,
  posB: Vec2, velB: Vec2, massB: number,
  restitution: number
): { velA: Vec2; velB: Vec2 } {
  const nx = posB.x - posA.x, ny = posB.y - posA.y;
  const d = Math.sqrt(nx * nx + ny * ny) || 0.001;
  const ux = nx / d, uy = ny / d;
  const dvx = velA.x - velB.x, dvy = velA.y - velB.y;
  const dot = dvx * ux + dvy * uy;
  if (dot <= 0) return { velA, velB }; // already separating
  const impulse = (2 * dot * restitution) / (massA + massB);
  return {
    velA: { x: velA.x - impulse * massB * ux, y: velA.y - impulse * massB * uy },
    velB: { x: velB.x + impulse * massA * ux, y: velB.y + impulse * massA * uy },
  };
}

// Separate overlapping circles
function separate(posA: Vec2, posB: Vec2, raioA: number, raioB: number): { posA: Vec2; posB: Vec2 } {
  const dx = posB.x - posA.x, dy = posB.y - posA.y;
  const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
  const overlap = (raioA + raioB - d) / 2;
  const ux = dx / d, uy = dy / d;
  return {
    posA: { x: posA.x - ux * overlap, y: posA.y - uy * overlap },
    posB: { x: posB.x + ux * overlap, y: posB.y + uy * overlap },
  };
}

export interface PhysicsResult {
  botoes: Botao[];
  bola: Bola;
  bolaEmGol: 1 | 2 | null;   // quem levou gol
  faltaDetectada: { posicao: Vec2; jogadorFaltoso: 1 | 2 } | null;
  tocouBola: boolean;
}

export function stepPhysics(botoes: Botao[], bola: Bola): PhysicsResult {
  const MIN_SPEED = 0.15;
  let bs = botoes.map((b) => ({ ...b, posicao: { ...b.posicao }, velocidade: { ...b.velocidade } }));
  let bl = { ...bola, posicao: { ...bola.posicao }, velocidade: { ...bola.velocidade } };
  let faltaDetectada: PhysicsResult['faltaDetectada'] = null;
  let tocouBola = false;
  let bolaEmGol: 1 | 2 | null = null;

  // Move entities
  bl.posicao.x += bl.velocidade.x;
  bl.posicao.y += bl.velocidade.y;
  bl.velocidade.x *= BOTAO.FRICCAO;
  bl.velocidade.y *= BOTAO.FRICCAO;
  if (speed(bl.velocidade) < MIN_SPEED) bl.velocidade = { x: 0, y: 0 };

  for (const b of bs) {
    b.posicao.x += b.velocidade.x;
    b.posicao.y += b.velocidade.y;
    b.velocidade.x *= BOTAO.FRICCAO;
    b.velocidade.y *= BOTAO.FRICCAO;
    if (speed(b.velocidade) < MIN_SPEED) b.velocidade = { x: 0, y: 0 };
  }

  // Botão vs bola collisions
  for (const b of bs) {
    const minDist = b.raio + bl.raio;
    if (dist(b.posicao, bl.posicao) < minDist) {
      tocouBola = true;
      const { velA, velB } = resolveCircleCollision(
        b.posicao, b.velocidade, 3,
        bl.posicao, bl.velocidade, 1,
        BOTAO.RESTITUICAO
      );
      b.velocidade = velA;
      bl.velocidade = velB;
      const sep = separate(b.posicao, bl.posicao, b.raio, bl.raio);
      b.posicao = sep.posA;
      bl.posicao = sep.posB;
    }
  }

  // Botão vs botão collisions (falta detection)
  for (let i = 0; i < bs.length; i++) {
    for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i], bx = bs[j];
      const minD = a.raio + bx.raio;
      if (dist(a.posicao, bx.posicao) < minD) {
        // Foul: attacker moving fast hits opponent
        const attackerSpeed = speed(a.velocidade);
        const defenderSpeed = speed(bx.velocidade);
        if (a.jogadorId !== bx.jogadorId) {
          const fastOne = attackerSpeed > defenderSpeed ? a : bx;
          if (speed(fastOne.velocidade) > BOTAO.FORCA_FALTA) {
            faltaDetectada = {
              posicao: { x: (a.posicao.x + bx.posicao.x) / 2, y: (a.posicao.y + bx.posicao.y) / 2 },
              jogadorFaltoso: fastOne.jogadorId,
            };
          }
        }
        const { velA, velB } = resolveCircleCollision(
          a.posicao, a.velocidade, 3,
          bx.posicao, bx.velocidade, 3,
          BOTAO.RESTITUICAO
        );
        a.velocidade = velA;
        bx.velocidade = velB;
        const sep = separate(a.posicao, bx.posicao, a.raio, bx.raio);
        a.posicao = sep.posA;
        bx.posicao = sep.posB;
      }
    }
  }

  // Wall collisions for botoes
  for (const b of bs) {
    const r = clampToCampo(b.posicao, b.raio, b.velocidade);
    b.posicao = r.pos;
    b.velocidade = r.vel;
  }

  // Wall + gol logic for bola
  const gL = CAMPO.LARGURA / 2 - CAMPO.GOL_LARGURA / 2;
  const gR = CAMPO.LARGURA / 2 + CAMPO.GOL_LARGURA / 2;

  // Top wall / gol J2
  if (bl.posicao.y - bl.raio < 0) {
    if (bl.posicao.x >= gL && bl.posicao.x <= gR) {
      bolaEmGol = 1; // J1 marcou gol em J2
    } else {
      bl.posicao.y = bl.raio;
      bl.velocidade.y = Math.abs(bl.velocidade.y) * BOTAO.RESTITUICAO;
    }
  }
  // Bottom wall / gol J1
  if (bl.posicao.y + bl.raio > CAMPO.ALTURA) {
    if (bl.posicao.x >= gL && bl.posicao.x <= gR) {
      bolaEmGol = 2; // J2 marcou gol em J1
    } else {
      bl.posicao.y = CAMPO.ALTURA - bl.raio;
      bl.velocidade.y = -Math.abs(bl.velocidade.y) * BOTAO.RESTITUICAO;
    }
  }
  // Side walls
  if (bl.posicao.x - bl.raio < 0) { bl.posicao.x = bl.raio; bl.velocidade.x = Math.abs(bl.velocidade.x) * BOTAO.RESTITUICAO; }
  if (bl.posicao.x + bl.raio > CAMPO.LARGURA) { bl.posicao.x = CAMPO.LARGURA - bl.raio; bl.velocidade.x = -Math.abs(bl.velocidade.x) * BOTAO.RESTITUICAO; }

  return { botoes: bs, bola: bl, bolaEmGol, faltaDetectada, tocouBola };
}

export function tudoParado(botoes: Botao[], bola: Bola): boolean {
  const MIN = 0.15;
  if (speed(bola.velocidade) > MIN) return false;
  return botoes.every((b) => speed(b.velocidade) <= MIN);
}
