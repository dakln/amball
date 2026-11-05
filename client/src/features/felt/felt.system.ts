import * as ECS from '@horizon/ecs';
import { RenderKit } from '@horizon/engine';

import { match } from '@/shared/net/match.store.ts';
import { FELT_SHADER, SCREEN_SHADER } from '@/shared/table-shaders.ts';
import { TABLE_CENTER, VIEW_HEIGHT, VIEW_WIDTH } from '@/shared/table-layout.ts';

type Tint = [number, number, number];

const CALM: Tint = [0.09, 0.3, 0.24];
/** Каждый раунд стол меняет цвет: основа и оттенок разводов. */
const ROUND_PALETTES: { tint: Tint; accent: Tint }[] = [
  { tint: CALM, accent: [0.2, 0.75, 0.55] },
  { tint: [0.12, 0.17, 0.36], accent: [0.35, 0.5, 1.0] },
  { tint: [0.31, 0.11, 0.24], accent: [1.0, 0.35, 0.6] },
  { tint: [0.06, 0.26, 0.34], accent: [0.2, 0.8, 0.95] },
  { tint: [0.22, 0.13, 0.36], accent: [0.7, 0.4, 1.0] },
];
const SHOP: Tint = [0.32, 0.23, 0.08];
const SHOP_ACCENT: Tint = [1.0, 0.75, 0.25];
const PIPS = 22;
const PIP_COLORS = [0xfaf1dc, 0xffcf4a, 0xff7a66];
const YOUR_TURN: Tint = [0.26, 0.33, 0.16];
const TRUTH: Tint = [0.08, 0.42, 0.24];
const BLUFF: Tint = [0.44, 0.13, 0.12];
const TINT_RATE = 4;
const WAVE_SECONDS = 0.7;

function targetTint(): Tint {
  const { view } = match.snapshot;
  if (view?.reveal != null) return view.reveal.truthful ? TRUTH : BLUFF;
  if (view?.phase === 'shop') return SHOP;
  if (view?.phase === 'playing' && view.currentId === view.youId) return YOUR_TURN;
  return palette().tint;
}

function palette(): { tint: Tint; accent: Tint } {
  const round = match.snapshot.view?.round ?? 1;
  return ROUND_PALETTES[(round - 1) % ROUND_PALETTES.length]!;
}

interface Pip {
  transform: ECS.Transform;
  speed: number;
  spin: number;
  sway: number;
  baseX: number;
}

/** Фон стола: сукно окрашивается состоянием партии, вскрытие расходится волной по кадру. */
export class FeltSystem extends ECS.System {
  private felt: ReturnType<typeof RenderKit.Effects.custom> | null = null;
  private time = 0;
  private wasRevealing = false;
  private pips: Pip[] = [];

  public override onEnter(): void {
    this.pips = [];
    // Сущность прошлого входа снял план сцены.
    this.felt = null;
    this.wasRevealing = false;
  }

  public override onUpdate(dt: number): void {
    this.felt ??= this.spawn();
    this.time += dt;
    const uniforms = this.felt.uniforms as { uTint: Tint; uTime: number; uAccent: Tint };
    const blend = 1 - Math.exp(-TINT_RATE * dt);
    const target = targetTint();
    uniforms.uTint = uniforms.uTint.map((v, i) => v + (target[i]! - v) * blend) as Tint;
    const accent = match.snapshot.view?.phase === 'shop' ? SHOP_ACCENT : palette().accent;
    uniforms.uAccent = uniforms.uAccent.map((v, i) => v + (accent[i]! - v) * blend) as Tint;
    uniforms.uTime = this.time;
    for (const pip of this.pips) {
      const { transform } = pip;
      transform.y -= pip.speed * dt;
      if (transform.y < -12) transform.y = VIEW_HEIGHT + 12;
      transform.x = pip.baseX + Math.sin(this.time * 0.5 + pip.sway) * 16;
      transform.rotation += pip.spin * dt;
    }

    const revealing = match.snapshot.view?.reveal != null;
    if (revealing && !this.wasRevealing) this.startWave();
    this.wasRevealing = revealing;
  }

  private spawn(): ReturnType<typeof RenderKit.Effects.custom> {
    const felt = RenderKit.Effects.custom(FELT_SHADER, {
      uniforms: { uTint: [...CALM], uTime: 0, uAccent: [...ROUND_PALETTES[0]!.accent] },
    });
    this.world.cmd.spawn([
      new ECS.Transform(),
      new RenderKit.Graphics({
        draw: (g) => g.rect(0, 0, VIEW_WIDTH, VIEW_HEIGHT).fill('white'),
        zIndex: -1000,
      }),
      new RenderKit.Filters({ felt }),
    ]);
    this.world
      .getSingleton(RenderKit.ViewportEffects)
      .add('screen', RenderKit.Effects.custom(SCREEN_SHADER, { uniforms: { uStrength: 1 } }));
    for (let i = 0; i < PIPS; i++) this.spawnPip(i);
    return felt;
  }

  /** Парящие за картами ромбы: фон не замирает, даже когда никто не ходит. */
  private spawnPip(index: number): void {
    const baseX = Math.random() * VIEW_WIDTH;
    const transform = new ECS.Transform({ x: baseX, y: Math.random() * VIEW_HEIGHT });
    const size = 3 + Math.random() * 6;
    const color = PIP_COLORS[index % PIP_COLORS.length]!;
    this.world.cmd.spawn([
      transform,
      new RenderKit.Graphics({
        draw: (g) =>
          g.poly([0, -size, size * 0.7, 0, 0, size, -size * 0.7, 0]).fill({ color, alpha: 0.13 }),
        zIndex: -900,
      }),
    ]);
    this.pips.push({
      transform,
      baseX,
      speed: 6 + Math.random() * 14,
      spin: (Math.random() - 0.5) * 1.4,
      sway: Math.random() * Math.PI * 2,
    });
  }

  private startWave(): void {
    const effects = this.world.getSingleton(RenderKit.ViewportEffects);
    effects.add(
      'revealWave',
      RenderKit.Effects.shockwave({
        centerX: TABLE_CENTER.x,
        centerY: TABLE_CENTER.y,
        amplitude: 10,
        wavelength: 90,
        speed: 520,
      }),
      {
        duration: WAVE_SECONDS,
        onUpdate: (wave, progress) => {
          wave.time = progress * WAVE_SECONDS;
        },
      },
    );
  }
}
