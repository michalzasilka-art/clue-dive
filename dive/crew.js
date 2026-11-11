// Clue Dive's cast and monsters, as pictures (ChatGPT illustrations, prepared by Foxino/Clue Dive/Art/build_art.py).
import { META } from './art/sea-meta.js?v=3';

const ALL = [
  { id: 'foxino', name: 'Foxino', ours: true }, { id: 'stella', name: 'Stella', ours: true }, { id: 'pix', name: 'Pix', ours: true },
  { id: 'charlie', name: 'Charlie', ours: true }, { id: 'rob', name: 'Rob', ours: true }, { id: 'gummy', name: 'Gummy', ours: true },
  { id: 'penguin', name: 'Penguin' }, { id: 'bear', name: 'Polar Bear' }, { id: 'otter', name: 'Sea Otter' },
  { id: 'seal', name: 'Seal' }, { id: 'turtle', name: 'Turtle' }, { id: 'axolotl', name: 'Axolotl' },
];
export const CREW = ALL.filter((c) => !META.crew.length || META.crew.includes(c.id));
export const crewById = (id) => CREW.find((c) => c.id === id) || CREW[0];
export const validCrew = (id) => (CREW.some((c) => c.id === id) ? id : CREW[0].id);
export const artURL = (name) => new URL(`art/${name}.webp?v=3`, import.meta.url).href;
export const crewURL = (id) => artURL('crew-' + validCrew(id));

export const MONSTERS = [
  { id: 'crab', name: 'Giant Crab', tier: 1 }, { id: 'eel', name: 'Electric Eel', tier: 1 }, { id: 'jelly', name: 'Ghost Jelly', tier: 1 },
  { id: 'shark', name: 'Iron Shark', tier: 2 }, { id: 'squid', name: 'Giant Squid', tier: 2 }, { id: 'angler', name: 'Anglerfish', tier: 2 },
  { id: 'serpent', name: 'Sea Serpent', tier: 3 }, { id: 'kraken', name: 'The Kraken', tier: 3 }, { id: 'leviathan', name: 'The Leviathan', tier: 3 },
];
export const monsterById = (id) => MONSTERS.find((m) => m.id === id) || MONSTERS[0];
export const monsterURL = (id) => artURL('mon-' + id);
// how wide a monster is, as a share of the board's width: bigger kinds are bigger
export const monsterWidth = (id) => ({ crab: .13, eel: .17, jelly: .09, shark: .2, squid: .17, angler: .15, serpent: .27, kraken: .23, leviathan: .33 })[id] || .15;
export const aspect = (name) => { const sp = META.sprites[name]; return sp ? sp.h / sp.w : .5; };
export const SPRITES = META.sprites;
