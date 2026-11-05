import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';

import * as Engine from '@horizon/engine';

import type { JokerCard, JokerName, PlayerView, Rank, SeatView, ShopView } from '../../../server/src/game/protocol.types.ts';
import { assets } from '@/shared/assets/amball.assets.ts';
import { match, type MatchSnapshot } from '@/shared/net/match.store.ts';
import { BUTTON, BUTTON_CHECK, BUTTON_DROP, BUTTON_PLAY, DIM, GOLD, INK, PANEL, RED, THEME } from '@/shared/ui-style.ts';
import { JOKERS, RANK_LABELS } from '@/shared/card-art.ts';
import { SHOP_REVEAL_SHADER } from '@/shared/table-shaders.ts';
import { opponentColumn } from '@/shared/table-layout.ts';

const { UI } = Engine;

const SEAT_LABEL_WIDTH = 140;
const MAX_JOKERS = 5;
const TIMER_WARNING = 5;
const REVEAL_SECONDS = 0.8;
const REVEAL_STAGGER = 0.2;

export function useMatch(): MatchSnapshot {
  return useSyncExternalStore(match.subscribe, match.getSnapshot);
}

function seatName(view: PlayerView, id: string | null | undefined): string {
  return view.seats.find((seat) => seat.id === id)?.name ?? 'Игрок';
}

function Lobby({ view }: { view: PlayerView }): React.JSX.Element {
  const isHost = view.hostId === view.youId;
  return (
    <UI.Panel anchor='center' padding={18} minWidth={340} {...PANEL}>
      <UI.VBox separation={8}>
        <UI.Label size={22} color={GOLD}>Ожидание игроков</UI.Label>
        <UI.Label color={DIM}>Колода: {view.deckType} карт · {view.seats.length} из 4</UI.Label>
        {view.seats.map((seat) => (
          <UI.Label key={seat.id}>
            {seat.name}{seat.id === view.hostId ? ' (создатель)' : ''}{seat.id === view.youId ? ' — вы' : ''}
          </UI.Label>
        ))}
        {isHost ? (
          <UI.Button {...BUTTON} padding={8} disabled={view.seats.length < 2} onPress={() => match.start()}>
            <UI.Label>{view.seats.length < 2 ? 'Нужен ещё игрок' : 'Начать игру'}</UI.Label>
          </UI.Button>
        ) : (
          <UI.Label color={DIM}>Игру начнёт создатель комнаты</UI.Label>
        )}
        <UI.Button {...BUTTON} padding={8} onPress={() => match.leave()}>
          <UI.Label>Выйти</UI.Label>
        </UI.Button>
      </UI.VBox>
    </UI.Panel>
  );
}

function Finished({ view }: { view: PlayerView }): React.JSX.Element {
  const isHost = view.hostId === view.youId;
  return (
    <UI.Panel anchor='center' padding={18} minWidth={340} {...PANEL}>
      <UI.VBox separation={8}>
        <UI.Label size={22} color={GOLD}>
          {view.placements[0] === view.youId ? 'Вы победили!' : 'Игра окончена'}
        </UI.Label>
        {view.placements.map((id, index) => (
          <UI.Label key={id}>{index + 1}. {seatName(view, id)}</UI.Label>
        ))}
        {isHost && view.seats.length >= 2 ? (
          <UI.Button {...BUTTON} padding={8} onPress={() => match.rematch()}>
            <UI.Label>Сыграть ещё</UI.Label>
          </UI.Button>
        ) : null}
        <UI.Button {...BUTTON} padding={8} onPress={() => match.leave()}>
          <UI.Label>В меню</UI.Label>
        </UI.Button>
      </UI.VBox>
    </UI.Panel>
  );
}

function SeatLabel({ seat, view, x }: { seat: SeatView; view: PlayerView; x: number }): React.JSX.Element {
  const isCurrent = seat.id === view.currentId;
  return (
    <UI.Label
      topLevel
      position={{ x: x - SEAT_LABEL_WIDTH / 2, y: 2 }}
      minWidth={SEAT_LABEL_WIDTH}
      align='center'
      color={isCurrent ? GOLD : undefined}
    >
      {isCurrent ? '▶ ' : ''}{seat.name}: {seat.cardCount}{seat.isOut ? ' (вышел)' : ''}
    </UI.Label>
  );
}

function JokerSlot({ joker, active, width }: { joker: JokerCard; active: boolean; width: number }): React.JSX.Element {
  const info = JOKERS[joker.name];
  return (
    <UI.Button
      {...BUTTON}
      padding={2}
      disabled={!active}
      tooltip={`${info.title}. ${info.text}`}
      onPress={() => match.useJoker(joker)}
    >
      <UI.TextureRect texture={assets.jokers} region={info.art} minWidth={width} minHeight={Math.round((width * 95) / 71)} stretch='scale' />
    </UI.Button>
  );
}

function RankPicker({ view, picked, breathing }: { view: PlayerView; picked: Rank | null; breathing: boolean }): React.JSX.Element {
  return (
    <UI.HBox topLevel position={{ x: 150, y: 292 }} separation={3}>
      {view.ranks.map((rank) => (
        <UI.Button
          key={rank}
          {...BUTTON}
          padding={4}
          minWidth={32}
          // Объявленное достоинство менять нельзя: выбор открывает только «Новое дыхание».
          disabled={view.tableRank !== null && !breathing}
          selected={breathing ? false : (view.tableRank ?? picked) === rank}
          onPress={() => match.pickRank(rank)}
        >
          <UI.Label align='center'>{RANK_LABELS[rank]}</UI.Label>
        </UI.Button>
      ))}
    </UI.HBox>
  );
}

/** Короткий толчок при смене значения: монеты и таймер заметны боковым зрением. */
function usePop(value: unknown, enabled = true): React.RefObject<Engine.UiHandle | null> {
  const ref = useRef<Engine.UiHandle>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!enabled) return;
    ref.current?.setVisual({ scale: 1.45 });
    ref.current?.tween({ scale: 1 }, { duration: 0.28 });
  }, [value, enabled]);
  return ref;
}

/** Считает от последнего значения сервера: каждый новый вид сверяет отсчёт. */
function useCountdown(view: PlayerView): number | null {
  const [left, setLeft] = useState(view.secondsLeft);
  useEffect(() => {
    setLeft(view.secondsLeft);
    if (view.secondsLeft === null) return undefined;
    const timer = setInterval(() => setLeft((value) => (value === null ? null : Math.max(0, value - 1))), 1000);
    return () => clearInterval(timer);
  }, [view]);
  return left;
}

/** Рисунок джокера прожигается шейдером; соседние начинают с запозданием. После показа эффект выключен. */
function ShopArt({ name, slot }: { name: JokerName; slot: number }): React.JSX.Element {
  const reveal = useMemo(
    () => Engine.RenderKit.Effects.custom(SHOP_REVEAL_SHADER, { uniforms: { uProgress: 0 } }),
    [],
  );
  const effects = useMemo(() => ({ reveal }), [reveal]);
  useEffect(() => {
    reveal.enabled = true;
    reveal.uniforms['uProgress'] = 0;
    let frame = 0;
    let startedAt: number | null = null;
    const step = (now: number): void => {
      startedAt ??= now;
      const elapsed = (now - startedAt) / 1000 - slot * REVEAL_STAGGER;
      const progress = Math.min(1, Math.max(0, elapsed / REVEAL_SECONDS));
      reveal.uniforms['uProgress'] = progress;
      if (progress < 1) frame = requestAnimationFrame(step);
      else reveal.enabled = false;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [name, slot, reveal]);
  return <UI.TextureRect effects={effects} texture={assets.jokers} region={JOKERS[name].art} minWidth={85} minHeight={114} stretch='scale' />;
}

/** Предложение вылетает при открытии витрины и при реролле; соседние идут с запозданием. */
function ShopOffer({ slot, name, children }: { slot: number; name: string | null; children: React.ReactNode }): React.JSX.Element {
  const ref = useRef<Engine.UiHandle>(null);
  useEffect(() => {
    ref.current?.setVisual({ scale: 0.82, rotation: slot % 2 === 0 ? -0.05 : 0.05 });
    ref.current?.tween({ scale: 1, rotation: 0 }, { duration: 0.3 + slot * REVEAL_STAGGER });
  }, [name, slot]);
  return <UI.Panel ref={ref} padding={8} minWidth={190} {...PANEL}>{children}</UI.Panel>;
}

function ShopOverlay({ shop, view }: { shop: ShopView; view: PlayerView }): React.JSX.Element {
  const left = useCountdown(view);
  const full = view.jokers.length >= MAX_JOKERS;
  const coinsRef = usePop(view.coins);
  const timerRef = usePop(left, left !== null && left <= TIMER_WARNING);
  const titleRef = useRef<Engine.UiHandle>(null);
  useEffect(() => {
    titleRef.current?.tween({ scale: 1.08 }, { duration: 0.7, mode: 'yoyo' });
  }, []);
  return (
    <>
    <UI.ColorRect topLevel anchor='full' color={0x060b0a} alpha={0.78} mouseFilter='stop' />
    <UI.Center topLevel anchor='full'>
      <UI.VBox separation={6}>
        <UI.Label ref={titleRef} size={24} color={GOLD} align='center'>Витрина джокеров</UI.Label>
        <UI.HBox separation={22} sizeH='center'>
          <UI.Label ref={coinsRef} color={GOLD}>Монеты: {view.coins}</UI.Label>
          <UI.Label>Джокеры: {view.jokers.length}/{MAX_JOKERS}</UI.Label>
          <UI.Label ref={timerRef} color={left !== null && left <= TIMER_WARNING ? RED : INK}>Осталось: {left ?? 0} с</UI.Label>
        </UI.HBox>
        <UI.HBox separation={12}>
          {shop.offers.map((offer, slot) => (
            <ShopOffer key={slot} slot={slot} name={offer?.name ?? null}>
              {offer === null ? (
                <UI.Label color={DIM} align='center'>Куплено</UI.Label>
              ) : (
                <UI.VBox separation={4}>
                  <UI.Center>
                    <ShopArt name={offer.name} slot={slot} />
                  </UI.Center>
                  <UI.Label color={GOLD} align='center'>{JOKERS[offer.name].title}</UI.Label>
                  <UI.Label size={11} autowrap maxWidth={174} minHeight={44} align='center'>{JOKERS[offer.name].text}</UI.Label>
                  <UI.Button {...BUTTON_PLAY} padding={6} disabled={shop.ready || full || view.coins < offer.cost} onPress={() => match.shopBuy(slot)}>
                    <UI.Label align='center'>Купить: {offer.cost}</UI.Label>
                  </UI.Button>
                  <UI.Button {...BUTTON} padding={5} disabled={shop.ready || view.coins < shop.rerollCost} onPress={() => match.shopReroll(slot)}>
                    <UI.Label align='center'>Реролл: {shop.rerollCost === 0 ? 'бесплатно' : shop.rerollCost}</UI.Label>
                  </UI.Button>
                </UI.VBox>
              )}
            </ShopOffer>
          ))}
        </UI.HBox>
        <UI.Button {...BUTTON_DROP} padding={8} disabled={shop.ready} onPress={() => match.shopReady()}>
          <UI.Label align='center'>
            {shop.ready ? `Ждём остальных: ${shop.readyCount}/${shop.total}` : 'Готово'}
          </UI.Label>
        </UI.Button>
      </UI.VBox>
    </UI.Center>
    </>
  );
}

function statusText(view: PlayerView): string {
  if (view.phase === 'shop') return 'Игроки у витрины джокеров';
  if (view.phase === 'reveal' && view.reveal !== null) {
    const { reveal } = view;
    const verdict = reveal.truthful ? 'Правда!' : 'Блеф!';
    const loser = reveal.loserId === null ? 'Стол уходит из игры' : `Стол забирает ${seatName(view, reveal.loserId)}`;
    return `${verdict} ${seatName(view, reveal.ownerId)} объявил ${RANK_LABELS[reveal.declared]}. ${loser}`;
  }
  if (view.currentId === view.youId) return 'Ваш ход';
  return `Ходит ${seatName(view, view.currentId)}`;
}

function Playing({ snapshot, view }: { snapshot: MatchSnapshot; view: PlayerView }): React.JSX.Element {
  const isTurn = view.phase === 'playing' && view.currentId === view.youId;
  const left = useCountdown(view);
  const coinsRef = usePop(view.coins);
  const timerRef = usePop(left, left !== null && left <= TIMER_WARNING);
  // Статус «дышит», пока ход ваш или идёт вскрытие: внимание туда, где решается раунд.
  const statusRef = useRef<Engine.UiHandle>(null);
  const pulsing = isTurn || view.phase === 'reveal';
  useEffect(() => {
    if (pulsing) statusRef.current?.tween({ scale: 1.14 }, { duration: 0.5, mode: 'yoyo' });
    else statusRef.current?.setVisual({ scale: 1 });
  }, [pulsing]);
  const { selected, pickedRank } = snapshot;
  const rank = view.tableRank ?? pickedRank;
  const opponents = view.seats.filter((seat) => seat.id !== view.youId);
  const selectedCards = view.hand.filter((card) => selected.includes(card.id));
  const canDrop = isTurn && selected.length === 4 && new Set(selectedCards.map((c) => c.rank)).size === 1;
  const sameRank = new Set(selectedCards.map((c) => c.rank)).size === 1;
  const canPlay = isTurn && selected.length >= 1 && (selected.length <= 4 || sameRank) && rank !== null;

  return (
    <>
      {opponents.map((seat, index) => (
        <SeatLabel key={seat.id} seat={seat} view={view} x={opponentColumn(index, opponents.length)} />
      ))}

      <UI.Label topLevel position={{ x: 30, y: 128 }} color={DIM}>Колода: {view.deckCount}</UI.Label>
      <UI.Label topLevel position={{ x: 30, y: 250 }} color={DIM}>Раунд {view.round}{view.direction === 1 ? '' : ' · ход в обратную сторону'}</UI.Label>

      {left === null ? null : (
        <UI.Label ref={timerRef} topLevel position={{ x: 200, y: 122 }} minWidth={280} align='center' color={left <= TIMER_WARNING ? RED : DIM}>{left} с</UI.Label>
      )}
      <UI.Label ref={coinsRef} topLevel position={{ x: 30, y: 232 }} color={GOLD}>Монеты: {view.coins}</UI.Label>
      <UI.VBox topLevel position={{ x: 200, y: 100 }} minWidth={280} separation={0}>
        <UI.Label ref={statusRef} align='center' size={16} color={isTurn ? GOLD : undefined}>{statusText(view)}</UI.Label>
      </UI.VBox>
      <UI.Label topLevel position={{ x: 230, y: 268 }} minWidth={220} align='center'>
        {view.tableRank === null ? 'Стол пуст' : `На столе ${view.tableCount}, достоинство ${RANK_LABELS[view.tableRank]}`}
        {view.lastTurn === null ? '' : ` · последний ход: ${view.lastTurn.count}`}
      </UI.Label>

      {view.scouted === null ? null : (
        <UI.Label topLevel position={{ x: 452, y: 128 }} color={GOLD}>Разведка</UI.Label>
      )}
      {view.spied === null ? null : (
        <UI.Label topLevel position={{ x: 517, y: 128 }} color={GOLD}>Карты: {view.spied.ownerName}</UI.Label>
      )}

      {isTurn ? <RankPicker view={view} picked={pickedRank} breathing={snapshot.breathing !== null} /> : null}

      <UI.VBox topLevel position={{ x: 655, y: 8 }} separation={4} minWidth={190}>
        <UI.Label color={DIM}>Ваши джокеры</UI.Label>
        <UI.HBox separation={4}>
          {view.jokers.map((joker) => (
            <JokerSlot
              key={joker.id}
              joker={joker}
              active={isTurn}
              width={Math.min(53, Math.floor((190 - 8 * view.jokers.length) / Math.max(1, view.jokers.length)))}
            />
          ))}
        </UI.HBox>
        <UI.Label color={DIM}>Журнал</UI.Label>
        {view.log.map((line, index) => (
          <UI.Label key={`${index}-${line}`} size={11} autowrap maxWidth={190}>{line}</UI.Label>
        ))}
      </UI.VBox>

      <UI.VBox topLevel position={{ x: 655, y: 360 }} separation={5} minWidth={190}>
        <UI.Button {...BUTTON_PLAY} padding={7} disabled={!canPlay} onPress={() => match.play()}>
          <UI.Label align='center'>Положить ({selected.length})</UI.Label>
        </UI.Button>
        <UI.HBox separation={5}>
          <UI.Button {...BUTTON_CHECK} padding={7} sizeH='expand' disabled={!view.canCheck} onPress={() => match.check()}>
            <UI.Label align='center'>Проверить</UI.Label>
          </UI.Button>
          <UI.Button {...BUTTON_DROP} padding={7} sizeH='expand' disabled={!canDrop} onPress={() => match.drop()}>
            <UI.Label align='center'>Сбросить</UI.Label>
          </UI.Button>
        </UI.HBox>
        <UI.Button {...BUTTON} padding={5} onPress={() => match.leave()}>
          <UI.Label align='center' color={DIM}>Выйти</UI.Label>
        </UI.Button>
      </UI.VBox>
    </>
  );
}

export default function GameHud(): React.JSX.Element | null {
  const snapshot = useMatch();
  const { view, toast, inRoom } = snapshot;
  const app = Engine.useApp();
  // Вид пропал — комнаты больше нет (вышли сами или порвалось соединение).
  useEffect(() => {
    if (!inRoom) void app.goToScene('menu');
  }, [app, inRoom]);
  if (view === null) return null;
  return (
    <Engine.CanvasUI theme={THEME}>
      {view.phase === 'lobby' ? <Lobby view={view} /> : null}
      {view.phase === 'finished' ? <Finished view={view} /> : null}
      {view.shop !== null ? (
        <ShopOverlay shop={view.shop} view={view} />
      ) : view.phase === 'playing' || view.phase === 'reveal' || view.phase === 'shop' ? (
        <Playing snapshot={snapshot} view={view} />
      ) : null}
      {toast === null ? null : (
        <UI.Panel topLevel anchor='center-top' margin={150} padding={8} {...PANEL} border={RED}>
          <UI.Label color={RED}>{toast}</UI.Label>
        </UI.Panel>
      )}
    </Engine.CanvasUI>
  );
}
