import { defineAssets, font, texture } from '@horizon/engine';

import cardBasesImage from '@assets/images/card_bases.png';
import cardSkinsImage from '@assets/images/card_skins.png';
import jokersImage from '@assets/images/jokers.png';

import notoSansFont from '@assets/fonts/NotoSans.ttf';

const nearest = (url: string) => texture(url, { scaleMode: 'nearest' });

export const assets = defineAssets({
  cardBases: nearest(cardBasesImage),
  cardFaces: nearest(cardSkinsImage),
  jokers: nearest(jokersImage),
  font: font('Amball', notoSansFont),
});
