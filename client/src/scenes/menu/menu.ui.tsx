import { useEffect, useRef, useState } from 'react';

import * as Engine from '@horizon/engine';

import type { DeckType } from '../../../server/src/game/protocol.types.ts';
import { useMatch } from '../game/game.hud.tsx';
import { match } from '@/shared/net/match.store.ts';
import { BUTTON, DIM, GOLD, PANEL, RED, THEME } from '@/shared/ui-style.ts';

const { UI } = Engine;

export default function MenuUI(): React.JSX.Element {
  const app = Engine.useApp();
  const { connecting, toast } = useMatch();
  const [name, setName] = useState('');
  const [deckType, setDeckType] = useState<DeckType>('36');

  const titleRef = useRef<Engine.UiHandle>(null);
  useEffect(() => {
    titleRef.current?.tween({ scale: 1.08, rotation: 0.03 }, { duration: 1.1, mode: 'yoyo' });
  }, []);

  const enter = async (mode: 'create' | 'find'): Promise<void> => {
    if (await match.enter(mode, name, deckType)) await app.goToScene('game');
  };

  return (
    <Engine.CanvasUI theme={THEME}>
      <UI.Panel anchor='center' padding={20} minWidth={340} {...PANEL}>
        <UI.VBox separation={10}>
          <UI.Label ref={titleRef} size={34} color={GOLD} align='center'>
            AMBALL
          </UI.Label>
          <UI.Label color={DIM} align='center'>
            Карточная игра на блеф, 2–4 игрока
          </UI.Label>
          <UI.LineEdit value={name} placeholder='Ваше имя' maxLength={16} onChange={setName} />
          <UI.HBox separation={6}>
            {(['36', '52'] as const).map((type) => (
              <UI.Button
                key={type}
                {...BUTTON}
                padding={6}
                sizeH='expand'
                selected={deckType === type}
                onPress={() => setDeckType(type)}
              >
                <UI.Label align='center'>{type} карт</UI.Label>
              </UI.Button>
            ))}
          </UI.HBox>
          <UI.Button
            {...BUTTON}
            padding={9}
            disabled={connecting}
            onPress={() => void enter('create')}
          >
            <UI.Label align='center'>Создать игру</UI.Label>
          </UI.Button>
          <UI.Button
            {...BUTTON}
            padding={9}
            disabled={connecting}
            onPress={() => void enter('find')}
          >
            <UI.Label align='center'>Найти игру</UI.Label>
          </UI.Button>
          {toast === null ? null : (
            <UI.Label color={RED} align='center'>
              {toast}
            </UI.Label>
          )}
        </UI.VBox>
      </UI.Panel>
    </Engine.CanvasUI>
  );
}
