import * as ECS from '@horizon/ecs';
import { RenderKit } from '@horizon/engine';

import type { JokerEvent, JokerName } from '@amball/server';
import { assets } from '@/shared/assets/amball.assets.ts';
import { match } from '@/shared/net/match.store.ts';
import { BACK_REGION, JOKERS } from '@/shared/card-art.ts';
import { exchangeRing, layoutTable, seatPosition, TABLE_CENTER } from '@/shared/table-layout.ts';

const { Effects } = RenderKit;

const FX_SECONDS = 0.95;
const BANNER_SECONDS = 1.5;
const FX_Z = 5000;
const PASS_CARDS = 7;
const PASS_SECONDS = 1.3;
const PASS_STAGGER = 0.07;
const ARROWS = 4;
const TRAP_SECONDS = 2.6;
const TRAP_TITLE_Y = 34;
const ARROW_RADIUS_X = 170;
const ARROW_RADIUS_Y = 95;
const BANNER = { x: 340, y: 150 };

type Draw = (
  g: Parameters<ConstructorParameters<typeof RenderKit.Graphics>[0]['draw']>[0],
  color: number,
) => void;

interface Look {
  color: number;
  /** Что разлетается от места применения. */
  count: number;
  speed: number;
  gravity: number;
  shape: Draw;
  frame: () => void;
}

const dot: Draw = (g, color) => void g.circle(0, 0, 3).fill(color);
const square: Draw = (g, color) => void g.rect(-3, -3, 6, 6).fill(color);
const thread: Draw = (g, color) => void g.rect(-7, -1, 14, 2).fill(color);
const shard: Draw = (g, color) => void g.poly([0, -6, 4, 4, -3, 2]).fill(color);
const diamond: Draw = (g, color) => void g.poly([0, -5, 4, 0, 0, 5, -4, 0]).fill(color);
const ring: Draw = (g, color) => void g.circle(0, 0, 5).stroke({ color, width: 2 });
const minicard: Draw = (g, color) =>
  void g.rect(-4, -6, 8, 12).fill(color).stroke({ color: 0xffffff, width: 1 });

/** Вид применения: у каждого джокера свой эффект кадра, цвет и осколки. */
function lookOf(name: JokerName, world: ECS.System['world']): Look {
  const stack = world.getSingleton(RenderKit.ViewportEffects);
  const center = { centerX: TABLE_CENTER.x, centerY: TABLE_CENTER.y };
  const options = { duration: FX_SECONDS };
  switch (name) {
    case 'Joker':
      return {
        color: 0xffcf4a,
        count: 26,
        speed: 190,
        gravity: 120,
        shape: diamond,
        frame: () =>
          stack.add('jokerFx', Effects.hsl({ hue: 0 }), {
            ...options,
            onUpdate: (e, p) => {
              e.hue = 360 * p;
              e.alpha = 1 - p;
            },
          }),
      };
    case 'Textiler':
      return {
        color: 0xf4f0ff,
        count: 22,
        speed: 130,
        gravity: 0,
        shape: thread,
        frame: () =>
          stack.add('jokerFx', Effects.bloom({ threshold: 0.7, bloomScale: 0.5 }), {
            ...options,
            onUpdate: (e, p) => {
              e.bloomScale = 0.5 * (1 - p);
            },
          }),
      };
    case 'Cheater':
      return {
        color: 0x9fe6ff,
        count: 24,
        speed: 220,
        gravity: 260,
        shape: shard,
        frame: () =>
          stack.add('jokerFx', Effects.rgbSplit(), {
            ...options,
            onUpdate: (e, p) => {
              e.redX = 9 * (1 - p);
              e.blueX = -9 * (1 - p);
            },
          }),
      };
    case 'Scout':
      return {
        color: 0x62b8ff,
        count: 14,
        speed: 90,
        gravity: 0,
        shape: ring,
        frame: () =>
          stack.add('jokerFx', Effects.zoomBlur({ ...center, strength: 0.2, innerRadius: 90 }), {
            ...options,
            onUpdate: (e, p) => {
              e.strength = 0.2 * (1 - p);
            },
          }),
      };
    case 'Exchanger':
      return {
        color: 0xc58cff,
        count: 20,
        speed: 320,
        gravity: 0,
        shape: minicard,
        frame: () =>
          stack.add('jokerFx', Effects.motionBlur({ kernelSize: 15 }), {
            ...options,
            onUpdate: (e, p) => {
              e.velocityX = 34 * Math.sin(p * Math.PI * 2) * (1 - p);
            },
          }),
      };
    case 'TaxCollector':
      return {
        color: 0xe0b040,
        count: 30,
        speed: 170,
        gravity: 420,
        shape: dot,
        frame: () =>
          stack.add('jokerFx', Effects.colorMatrix({ saturation: -1 }), {
            ...options,
            onUpdate: (e, p) => {
              e.saturation = p - 1;
            },
          }),
      };
    case 'Dealer':
      return {
        color: 0x4fd6a0,
        count: 24,
        speed: 260,
        gravity: 90,
        shape: minicard,
        frame: () =>
          stack.add('jokerFx', Effects.glitch({ slices: 9, offset: 26 }), {
            ...options,
            onUpdate: (e, p) => {
              e.offset = 26 * (1 - p);
              e.seed = Math.random();
            },
          }),
      };
    case 'IKnew':
      return {
        color: 0xff6fb0,
        count: 18,
        speed: 150,
        gravity: 0,
        shape: diamond,
        frame: () =>
          stack.add('jokerFx', Effects.pixelate({ sizeX: 10, sizeY: 10 }), {
            ...options,
            onUpdate: (e, p) => {
              e.sizeX = e.sizeY = Math.max(1, Math.round(10 * (1 - p)));
            },
          }),
      };
    case 'NewBreathe':
      return {
        color: 0x7dffb0,
        count: 22,
        speed: 120,
        gravity: -120,
        shape: dot,
        frame: () =>
          stack.add(
            'jokerFx',
            Effects.shockwave({ ...center, amplitude: 18, wavelength: 120, speed: 420 }),
            {
              ...options,
              onUpdate: (e, p) => {
                e.time = p * FX_SECONDS;
              },
            },
          ),
      };
    case 'Additive':
      return {
        color: 0xa8ff60,
        count: 20,
        speed: 140,
        gravity: 160,
        shape: square,
        frame: () =>
          stack.add('jokerFx', Effects.adjustment({ green: 1.35 }), {
            ...options,
            onUpdate: (e, p) => {
              e.green = 1 + 0.35 * (1 - p);
            },
          }),
      };
    case 'Thief':
      return {
        color: 0x6a6a90,
        count: 26,
        speed: 240,
        gravity: 0,
        shape: square,
        frame: () =>
          stack.add('jokerFx', Effects.colorMatrix({ brightness: 0.3 }), {
            ...options,
            onUpdate: (e, p) => {
              e.brightness = 0.3 + 0.7 * p;
            },
          }),
      };
    case 'Elector':
      return {
        color: 0xff5a44,
        count: 34,
        speed: 230,
        gravity: 300,
        shape: square,
        frame: () =>
          stack.add('jokerFx', Effects.oldFilm({ sepia: 0.8, noise: 0.25, scratch: 0.5 }), {
            ...options,
            onUpdate: (e, p) => {
              e.sepia = 0.8 * (1 - p);
              e.noise = 0.25 * (1 - p);
            },
          }),
      };
    case 'Alchemist':
      return {
        color: 0xffcf4a,
        count: 30,
        speed: 170,
        gravity: 200,
        shape: dot,
        frame: () =>
          stack.add('jokerFx', Effects.bloom({ threshold: 0.5, bloomScale: 0.8 }), {
            ...options,
            onUpdate: (e, p) => {
              e.bloomScale = 0.8 * (1 - p);
            },
          }),
      };
    case 'Monochrome':
      return {
        color: 0xe8ecf4,
        count: 24,
        speed: 150,
        gravity: 40,
        shape: shard,
        frame: () =>
          stack.add('jokerFx', Effects.colorMatrix({ saturation: -1 }), {
            ...options,
            onUpdate: (e, p) => {
              e.saturation = -Math.sin(p * Math.PI);
            },
          }),
      };
    case 'Hourglass':
      return {
        color: 0xffa24a,
        count: 28,
        speed: 60,
        gravity: 240,
        shape: dot,
        frame: () =>
          stack.add('jokerFx', Effects.adjustment({ red: 1.4 }), {
            ...options,
            onUpdate: (e, p) => {
              e.red = 1 + 0.4 * (1 - p);
            },
          }),
      };
    case 'Spy':
      return {
        color: 0xb48cff,
        count: 12,
        speed: 70,
        gravity: 0,
        shape: ring,
        frame: () =>
          stack.add('jokerFx', Effects.colorMatrix({ saturation: -0.7, brightness: 0.55 }), {
            ...options,
            onUpdate: (e, p) => {
              e.saturation = -0.7 * (1 - p);
              e.brightness = 0.55 + 0.45 * p;
            },
          }),
      };
    case 'Reverse':
      return {
        color: 0x58e0e8,
        count: 16,
        speed: 110,
        gravity: 0,
        shape: diamond,
        frame: () =>
          stack.add('jokerFx', Effects.hsl({ hue: 180 }), {
            ...options,
            onUpdate: (e, p) => {
              e.hue = 180;
              e.alpha = 1 - p;
            },
          }),
      };
  }
}

interface Actor {
  entity: ECS.Entity;
  transform: ECS.Transform;
  age: number;
  life: number;
  update: (actor: Actor, dt: number, t: number) => void;
}

/** Перелёт за пределом и возврат: появление выглядит ударом, а не плавным зумом. */
function popIn(t: number): number {
  const c = 2.2;
  const x = t - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
}

/** Показывает применение джокеров; на правила не влияет. */
export class JokerFxSystem extends ECS.System {
  private readonly actors: Actor[] = [];
  private lastEvent = -1;
  private lastPayout = -1;

  public override onEnter(): void {
    this.actors.length = 0;
    this.lastEvent = -1;
    this.lastPayout = -1;
  }

  public override onUpdate(dt: number): void {
    const view = match.snapshot.view;
    if (view?.jokerEvent != null && view.jokerEvent.seq !== this.lastEvent) {
      // Первое чтение — событие из прошлого, его не показываем повторно.
      if (this.lastEvent !== -1 || view.jokerEvent.seq > 0) this.playEvent(view.jokerEvent);
      this.lastEvent = view.jokerEvent.seq;
    }
    if (view?.goldPayout != null && view.goldPayout.seq !== this.lastPayout) {
      this.lastPayout = view.goldPayout.seq;
      this.spawnLabel(
        `+${view.goldPayout.amount} монет`,
        TABLE_CENTER.x,
        TABLE_CENTER.y - 70,
        22,
        0xffcf4a,
        1.3,
      );
      this.burst(
        { color: 0xffcf4a, count: 26, speed: 180, gravity: 260, shape: dot, frame: () => {} },
        TABLE_CENTER.x,
        TABLE_CENTER.y,
      );
    }
    for (let i = this.actors.length - 1; i >= 0; i--) {
      const actor = this.actors[i]!;
      actor.age += dt;
      if (actor.age >= actor.life) {
        this.world.cmd.destroy(actor.entity);
        this.actors.splice(i, 1);
      } else {
        actor.update(actor, dt, actor.age / actor.life);
      }
    }
  }

  private playEvent(event: JokerEvent): void {
    const info = JOKERS[event.name];
    const look = lookOf(event.name, this.world);
    look.frame();

    const view = match.snapshot.view!;
    const actor = view.seats.find((seat) => seat.id === event.playerId)?.name ?? 'Игрок';
    this.spawnPopup(info.art, assets.jokers, look.color, BANNER_SECONDS);
    this.spawnLabel(info.title, BANNER.x, BANNER.y + 76, 22, look.color, BANNER_SECONDS);
    this.spawnLabel(actor, BANNER.x, BANNER.y + 100, 13, 0xfaf1dc, BANNER_SECONDS);

    const source = layoutTable(match.snapshot).find(
      (slot) => slot.card !== null && slot.card.id === event.originCardId,
    );
    this.burst(look, source?.x ?? TABLE_CENTER.x, source?.y ?? TABLE_CENTER.y);
    if (event.name === 'Exchanger') this.passHands();
    if (event.name === 'Reverse') this.spinArrows(look.color);
    if (event.trapCount > 0) this.playTrap(event, actor);
  }

  /** Ловушка: мир теряет цвет, по столу идёт волна, стол улетает к попавшемуся. */
  private playTrap(event: JokerEvent, actor: string): void {
    const stack = this.world.getSingleton(RenderKit.ViewportEffects);
    stack.add('trapDrain', Effects.colorMatrix({ saturation: -1 }), {
      duration: TRAP_SECONDS,
      onUpdate: (e, p) => {
        e.saturation = p < 0.7 ? -1 : -(1 - p) / 0.3;
      },
    });
    stack.add(
      'trapWave',
      Effects.shockwave({
        centerX: TABLE_CENTER.x,
        centerY: TABLE_CENTER.y,
        amplitude: 22,
        wavelength: 130,
        speed: 460,
      }),
      {
        duration: FX_SECONDS,
        onUpdate: (e, p) => {
          e.time = p * FX_SECONDS;
        },
      },
    );
    this.spawnLabel('МОНОХРОМНАЯ ЛОВУШКА!', BANNER.x, TRAP_TITLE_Y, 24, 0xffffff, TRAP_SECONDS);
    this.spawnLabel(
      `${actor} забирает стол: ${event.trapCount}`,
      BANNER.x,
      TRAP_TITLE_Y + 26,
      15,
      0xff7a66,
      TRAP_SECONDS,
    );
    const view = match.snapshot.view!;
    // Свои карты в руку ведёт система карт; остальные видят полёт к чужому месту.
    if (event.playerId === view.youId) return;
    const to = seatPosition(view, event.playerId);
    for (let i = 0; i < Math.min(event.trapCount, PASS_CARDS); i++) {
      const transform = new ECS.Transform({
        x: TABLE_CENTER.x,
        y: TABLE_CENTER.y,
        scaleX: 0,
        scaleY: 0,
      });
      const sprite = new RenderKit.Sprite({
        texture: assets.cardBases,
        region: { ...BACK_REGION },
        anchorX: 0.5,
        anchorY: 0.5,
        zIndex: FX_Z - 1,
      });
      const wait = i * 0.08;
      this.actors.push({
        entity: this.world.cmd.spawn([transform, sprite]),
        transform,
        age: 0,
        life: PASS_SECONDS,
        update: ({ transform: tr }, _dt, t) => {
          const raw = Math.min(1, Math.max(0, (t - wait) / (1 - wait)));
          const eased = raw * raw * (3 - 2 * raw);
          tr.x = TABLE_CENTER.x + (to.x - TABLE_CENTER.x) * eased;
          tr.y = TABLE_CENTER.y + (to.y - TABLE_CENTER.y) * eased - Math.sin(raw * Math.PI) * 40;
          tr.rotation = raw * Math.PI * 3;
          tr.scaleX = tr.scaleY = raw <= 0 || raw >= 1 ? 0 : 0.7;
        },
      });
    }
  }

  /** Разворот: стрелки кружат вокруг стола, тормозят и уходят в обратную сторону. */
  private spinArrows(color: number): void {
    for (let i = 0; i < ARROWS; i++) {
      const start = (i / ARROWS) * Math.PI * 2;
      const transform = new ECS.Transform({
        x: TABLE_CENTER.x,
        y: TABLE_CENTER.y,
        scaleX: 0,
        scaleY: 0,
      });
      const piece = new RenderKit.Graphics({
        draw: (g) =>
          void g
            .poly([-14, -7, 2, -7, 2, -14, 16, 0, 2, 14, 2, 7, -14, 7])
            .fill(color)
            .stroke({ color: 0x000000, width: 2 }),
        zIndex: FX_Z - 1,
      });
      this.actors.push({
        entity: this.world.cmd.spawn([transform, piece]),
        transform,
        age: 0,
        life: BANNER_SECONDS,
        update: ({ transform: tr }, _dt, t) => {
          // Угол — парабола: вращение замирает посередине и идёт назад.
          const turn = 4 * t * (1 - t);
          const backwards = t > 0.5;
          const angle = start + turn * Math.PI * 1.5;
          tr.x = TABLE_CENTER.x + Math.cos(angle) * ARROW_RADIUS_X;
          tr.y = TABLE_CENTER.y + Math.sin(angle) * ARROW_RADIUS_Y;
          tr.rotation = angle + (backwards ? -Math.PI / 2 : Math.PI / 2);
          tr.scaleX = tr.scaleY = t < 0.12 ? popIn(t / 0.12) : t > 0.88 ? (1 - t) / 0.12 : 1;
        },
      });
    }
  }

  /** Обменщик: от каждого места к следующему видимо летит пачка рубашек. */
  private passHands(): void {
    const view = match.snapshot.view!;
    const ring = exchangeRing(view);
    ring.forEach((id, index) => {
      const from = seatPosition(view, id);
      const to = seatPosition(view, ring[(index + 1) % ring.length]!);
      for (let i = 0; i < PASS_CARDS; i++) {
        const transform = new ECS.Transform({ x: from.x, y: from.y, scaleX: 0, scaleY: 0 });
        const sprite = new RenderKit.Sprite({
          texture: assets.cardBases,
          region: { ...BACK_REGION },
          anchorX: 0.5,
          anchorY: 0.5,
          zIndex: FX_Z - 1,
        });
        const wait = (i * PASS_STAGGER) / PASS_SECONDS;
        this.actors.push({
          entity: this.world.cmd.spawn([transform, sprite]),
          transform,
          age: 0,
          life: PASS_SECONDS,
          update: ({ transform: tr }, _dt, t) => {
            const raw = Math.min(
              1,
              Math.max(0, (t - wait) / (1 - (PASS_STAGGER * PASS_CARDS) / PASS_SECONDS)),
            );
            const eased = raw * raw * (3 - 2 * raw);
            // Дуга: пачка идёт над столом, а не сквозь него по прямой.
            const arc = Math.sin(raw * Math.PI) * 60;
            tr.x = from.x + (to.x - from.x) * eased + arc * 0.5;
            tr.y = from.y + (to.y - from.y) * eased - arc;
            tr.rotation = raw * Math.PI * 2;
            const size = raw <= 0 || raw >= 1 ? 0 : 0.7;
            tr.scaleX = tr.scaleY = size;
          },
        });
      }
    });
  }

  private spawnPopup(
    art: typeof BACK_REGION,
    texture: typeof assets.jokers,
    color: number,
    life: number,
  ): void {
    const transform = new ECS.Transform({ x: BANNER.x, y: BANNER.y, scaleX: 0, scaleY: 0 });
    const sprite = new RenderKit.Sprite({
      texture,
      region: { ...art },
      anchorX: 0.5,
      anchorY: 0.5,
      zIndex: FX_Z + 2,
      filters: { glow: Effects.outline({ thickness: 3, color }) },
    });
    this.actors.push({
      entity: this.world.cmd.spawn([transform, sprite]),
      transform,
      age: 0,
      life,
      update: ({ transform: tr }, _dt, t) => {
        const appear = t < 0.2 ? popIn(t / 0.2) : 1;
        const leave = t > 0.8 ? 1 - (t - 0.8) / 0.2 : 1;
        tr.scaleX = tr.scaleY = 1.35 * appear * leave;
        tr.rotation = Math.sin(t * 14) * 0.1 * (1 - t);
      },
    });
  }

  private spawnLabel(
    text: string,
    x: number,
    y: number,
    size: number,
    color: number,
    life: number,
  ): void {
    const transform = new ECS.Transform({ x, y });
    const label = new RenderKit.Text({
      text,
      font: assets.font,
      size,
      color,
      zIndex: FX_Z + 3,
      anchorX: 0.5,
      anchorY: 0.5,
      stroke: { color: 0x000000, width: 3 },
      resolution: 2,
    });
    this.actors.push({
      entity: this.world.cmd.spawn([transform, label]),
      transform,
      age: 0,
      life,
      update: ({ transform: tr }, _dt, t) => {
        const scale = t < 0.2 ? popIn(t / 0.2) : t > 0.85 ? (1 - t) / 0.15 : 1;
        tr.scaleX = tr.scaleY = scale;
      },
    });
  }

  private burst(look: Look, x: number, y: number): void {
    for (let i = 0; i < look.count; i++) {
      const angle = (i / look.count) * Math.PI * 2 + Math.random() * 0.5;
      const speed = look.speed * (0.45 + Math.random() * 0.75);
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;
      const spin = (Math.random() - 0.5) * 12;
      const transform = new ECS.Transform({ x, y, rotation: angle });
      const piece = new RenderKit.Graphics({
        draw: (g) => look.shape(g, look.color),
        zIndex: FX_Z + 1,
      });
      this.actors.push({
        entity: this.world.cmd.spawn([transform, piece]),
        transform,
        age: 0,
        life: 0.7 + Math.random() * 0.5,
        update: ({ transform: tr }, dt, t) => {
          vy += look.gravity * dt;
          vx *= Math.exp(-1.5 * dt);
          tr.x += vx * dt;
          tr.y += vy * dt;
          tr.rotation += spin * dt;
          tr.scaleX = tr.scaleY = 1 - t * t;
        },
      });
    }
  }
}
