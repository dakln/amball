import * as ECS from '@horizon/ecs';
import { InputRef, RenderKit } from '@horizon/engine';

import { assets } from '@/shared/assets/amball.assets.ts';
import { match } from '@/shared/net/match.store.ts';
import { BACK_REGION, baseRegion, faceRegion, type Region } from '@/shared/card-art.ts';
import { GLASS_SHADER, MONO_SHADER } from '@/shared/table-shaders.ts';
import {
  DECK_POSITION,
  exchangeRing,
  handCardAt,
  layoutTable,
  seatPosition,
  TABLE_CENTER,
  type CardSlot,
} from '@/shared/table-layout.ts';

// Пружина чуть недодемпфирована: карта приезжает с лёгким перелётом.
const SPRING = 170;
const DAMPING = 15;
const ROTATION_RATE = 10;
const DEAL_STAGGER = 0.05;
const REVEAL_STAGGER = 0.16;
const FLIP_SECONDS = 0.3;
const BOB_HEIGHT = 1.6;
const BOB_SPEED = 1.7;
const HOVER_LIFT = 10;
const HOVER_SCALE = 1.1;
const HOVER_TILT = 0.0016;
const SELECTED_SCALE = 1.06;

interface LivePart {
  entity: ECS.Entity;
  transform: ECS.Transform;
  sprite: RenderKit.Sprite;
}

interface LiveCard {
  base: LivePart;
  face: LivePart;
  /** Только у открытых карт: у рубашек эффектов не бывает. */
  effects: {
    glow: RenderKit.OutlineEffect;
    glass: RenderKit.CustomEffect;
    mono: RenderKit.CustomEffect;
    /** Лицо — отдельный спрайт, серым должно стать и оно. */
    faceMono: RenderKit.CustomEffect;
  } | null;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  vx: number;
  vy: number;
  vs: number;
  delay: number;
  /** 0 — рубашка, 1 — лицо; у всех, кроме вскрываемых, сразу 1. */
  flip: number;
}

/** Держит сущности карт по раскладке текущего вида и анимирует их. */
export class CardViewSystem extends ECS.System {
  private readonly live = new Map<string, LiveCard>();
  private lastSnapshot: unknown = null;
  private slots: CardSlot[] = [];
  private time = 0;

  public override onEnter(): void {
    // Сущности прошлого входа снял план сцены.
    this.live.clear();
    this.lastSnapshot = null;
  }

  public override onUpdate(dt: number): void {
    if (match.snapshot !== this.lastSnapshot) {
      this.lastSnapshot = match.snapshot;
      this.slots = layoutTable(match.snapshot);
      this.sync();
    }
    this.time += dt;
    const pointer = this.world.getSingleton(InputRef).pointer.viewport;
    const hovered = handCardAt(match.snapshot, pointer.x, pointer.y);

    this.slots.forEach((slot, index) => {
      const card = this.live.get(slot.key);
      if (card !== undefined) this.animate(card, slot, index, dt, hovered, pointer.x);
    });
  }

  private animate(
    card: LiveCard,
    slot: CardSlot,
    index: number,
    dt: number,
    hovered: number | null,
    pointerX: number,
  ): void {
    if (card.effects !== null) {
      card.effects.glass.uniforms['uTime'] = this.time;
      card.effects.mono.uniforms['uTime'] = this.time;
      card.effects.faceMono.uniforms['uTime'] = this.time;
    }
    if (card.delay > 0) {
      card.delay -= dt;
      return;
    }
    const isHover = slot.card !== null && slot.card.id === hovered && slot.key.startsWith('hand-');
    const isHand = slot.key.startsWith('hand-');
    const bob = isHand ? Math.sin(this.time * BOB_SPEED + index * 0.8) * BOB_HEIGHT : 0;
    const targetY = slot.y + bob - (isHover ? HOVER_LIFT : 0);
    let targetScale = slot.scale;
    if (slot.glow !== null && isHand) targetScale *= SELECTED_SCALE;
    if (isHover) targetScale *= HOVER_SCALE;
    const targetRotation = slot.rotation + (isHover ? (pointerX - slot.x) * HOVER_TILT : 0);

    const damp = Math.exp(-DAMPING * dt);
    card.vx = (card.vx + (slot.x - card.x) * SPRING * dt) * damp;
    card.vy = (card.vy + (targetY - card.y) * SPRING * dt) * damp;
    card.vs = (card.vs + (targetScale - card.scale) * SPRING * dt) * damp;
    card.x += card.vx * dt;
    card.y += card.vy * dt;
    card.scale += card.vs * dt;
    // Наклон от скорости: карта на лету заваливается в сторону движения.
    const lean = Math.max(-0.35, Math.min(0.35, card.vx * 0.0009));
    card.rotation += (targetRotation + lean - card.rotation) * (1 - Math.exp(-ROTATION_RATE * dt));
    card.flip = Math.min(1, card.flip + dt / FLIP_SECONDS);

    const showFace = slot.card !== null && card.flip >= 0.5;
    Object.assign(card.base.sprite.region!, showFace ? baseRegion(slot.card!) : BACK_REGION);
    if (showFace) Object.assign(card.face.sprite.region!, faceRegion(slot.card!));
    card.face.sprite.alpha = showFace ? 1 : 0;

    const flipWidth = Math.abs(Math.cos(Math.PI * (1 - card.flip)));
    for (const { transform } of [card.base, card.face]) {
      transform.x = card.x;
      transform.y = card.y;
      transform.rotation = card.rotation;
      transform.scaleX = card.scale * flipWidth;
      transform.scaleY = card.scale;
    }
  }

  private sync(): void {
    const wanted = new Set(this.slots.map((slot) => slot.key));
    for (const [key, card] of this.live) {
      if (wanted.has(key)) continue;
      this.world.cmd.destroy(card.base.entity);
      this.world.cmd.destroy(card.face.entity);
      this.live.delete(key);
    }
    let dealt = 0;
    let revealed = 0;
    for (const slot of this.slots) {
      let card = this.live.get(slot.key);
      if (card === undefined) {
        const delay = slot.key.startsWith('reveal-')
          ? revealed++ * REVEAL_STAGGER
          : slot.key.startsWith('hand-')
            ? this.isCopy(slot)
              ? 0
              : dealt++ * DEAL_STAGGER
            : 0;
        card = this.spawn(slot, delay);
      }
      if (card.effects !== null) {
        card.effects.glow.enabled = slot.glow !== null;
        if (slot.glow !== null) card.effects.glow.color = slot.glow;
        // Блик стекла подходит и золоту: текстура задаёт цвет, шейдер даёт сияние.
        card.effects.glass.enabled = slot.card?.type === 'Glass' || slot.card?.type === 'Gold';
        card.effects.mono.enabled = slot.card?.type === 'Mono';
        card.effects.faceMono.enabled = slot.card?.type === 'Mono';
      }
      card.base.sprite.zIndex = slot.z * 2;
      card.face.sprite.zIndex = slot.z * 2 + 1;
    }
  }

  private isCopy(slot: CardSlot): boolean {
    const fx = match.snapshot.view?.jokerEvent;
    return fx?.origin === 'card' && slot.card !== null && fx.newCardIds.includes(slot.card.id);
  }

  private spawnOrigin(slot: CardSlot): { x: number; y: number } {
    if (slot.key.startsWith('hand-')) {
      const view = match.snapshot.view;
      const fx = view?.jokerEvent;
      if (view != null && slot.card !== null && fx?.newCardIds.includes(slot.card.id)) {
        if (fx.origin === 'card') {
          const source = this.slots.find((s) => s.card?.id === fx.originCardId);
          // Копия отделяется от исходной карты, а не едет от колоды.
          if (source !== undefined) return { x: source.x, y: source.y - 12 };
        }
        if (fx.origin === 'table') return TABLE_CENTER;
        if (fx.origin === 'seat') {
          // Новая рука приезжает от того, кто её передал.
          const ring = exchangeRing(view);
          const me = ring.indexOf(view.youId);
          return seatPosition(view, ring[(me + ring.length - 1) % ring.length]!);
        }
      }
      return DECK_POSITION;
    }
    if (slot.key.startsWith('reveal-') || slot.key.startsWith('scout-')) return TABLE_CENTER;
    if (slot.key.startsWith('spy-')) {
      // Подсмотренные карты приезжают от их хозяина.
      const { view } = match.snapshot;
      return view?.spied == null ? slot : seatPosition(view, view.spied.ownerId);
    }
    if (slot.key.startsWith('table-')) {
      const { view } = match.snapshot;
      // Сыгранная карта прилетает от того, кто её положил.
      return view?.lastTurn == null ? slot : seatPosition(view, view.lastTurn.playerId);
    }
    return slot;
  }

  private spawn(slot: CardSlot, delay: number): LiveCard {
    const from = this.spawnOrigin(slot);
    const isReveal = /^(reveal|scout|spy)-/.test(slot.key);
    const effects =
      slot.card === null
        ? null
        : {
            glow: RenderKit.Effects.outline({ thickness: 2, enabled: false }),
            glass: RenderKit.Effects.custom(GLASS_SHADER, {
              uniforms: { uTime: 0 },
              enabled: false,
            }),
            mono: RenderKit.Effects.custom(MONO_SHADER, { uniforms: { uTime: 0 }, enabled: false }),
            faceMono: RenderKit.Effects.custom(MONO_SHADER, {
              uniforms: { uTime: 0 },
              enabled: false,
            }),
          };
    const card: LiveCard = {
      base: this.spawnPart(assets.cardBases, from, slot.scale),
      face: this.spawnPart(assets.cardFaces, from, slot.scale),
      effects,
      x: from.x,
      y: from.y,
      // Копия Текстильщика вырастает из исходной карты.
      scale: this.isCopy(slot) ? 0.2 : slot.scale,
      rotation: 0,
      vx: 0,
      vy: 0,
      vs: 0,
      delay,
      flip: isReveal ? 0 : 1,
    };
    card.face.sprite.alpha = 0;
    if (effects !== null) {
      const { glow, glass, mono, faceMono } = effects;
      this.world.cmd.add(card.base.entity, new RenderKit.Filters({ glow, glass, mono }));
      this.world.cmd.add(card.face.entity, new RenderKit.Filters({ faceMono }));
    }
    this.live.set(slot.key, card);
    return card;
  }

  private spawnPart(
    texture: typeof assets.cardBases,
    from: { x: number; y: number },
    scale: number,
  ): LivePart {
    const region: Region = { ...BACK_REGION };
    const transform = new ECS.Transform({ x: from.x, y: from.y, scaleX: scale, scaleY: scale });
    const sprite = new RenderKit.Sprite({ texture, region, anchorX: 0.5, anchorY: 0.5 });
    return { entity: this.world.cmd.spawn([transform, sprite]), transform, sprite };
  }
}
