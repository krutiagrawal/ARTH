// "Species Scramble": each entry is a plant name plus a one-line hint.
export interface ScrambleWord {
  word: string; // upper-case, letters only
  hint: string;
}

export const SCRAMBLE_WORDS: ScrambleWord[] = [
  { word: 'MANGO', hint: 'Called the "king of fruits"' },
  { word: 'BANYAN', hint: 'Its aerial roots become new trunks' },
  { word: 'NEEM', hint: 'The "village pharmacy" tree' },
  { word: 'TEAK', hint: 'A prized hardwood timber tree' },
  { word: 'BAMBOO', hint: 'A giant, fast-growing grass' },
  { word: 'PEEPAL', hint: 'A fig tree with heart-shaped leaves' },
  { word: 'COCONUT', hint: 'A palm with a big hard-shelled fruit' },
  { word: 'GUAVA', hint: 'A fruit tree rich in vitamin C' },
  { word: 'JAMUN', hint: 'Purple berries, also called black plum' },
  { word: 'AMLA', hint: 'Also known as Indian gooseberry' },
  { word: 'MORINGA', hint: 'The drumstick tree' },
  { word: 'ARJUNA', hint: 'A tall riverbank tree with pale bark' },
  { word: 'KADAMBA', hint: 'Famous for round orange flower balls' },
  { word: 'GULMOHAR', hint: 'Flame-red summer blossoms' },
  { word: 'JACARANDA', hint: 'Covers streets in purple blossoms' },
  { word: 'SANDALWOOD', hint: 'Prized for its fragrant heartwood' },
  { word: 'MANGROVE', hint: 'A salt-tolerant coastal forest tree' },
  { word: 'KHEJRI', hint: 'The state tree of Rajasthan' },
  { word: 'ORANGE', hint: 'A citrus fruit tree' },
  { word: 'CHAMPA', hint: 'Fragrant frangipani flowers' },
];
