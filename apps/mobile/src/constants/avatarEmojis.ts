/** Curated set of emoji offered as avatar choices — the app's own nature/planting-themed set,
 * not the full Unicode emoji keyboard. Kept as a flat category list so the picker screen can
 * render section headers without any extra lookup. */
export interface AvatarEmojiCategory {
  label: string;
  emojis: string[];
}

export const AVATAR_EMOJI_CATEGORIES: AvatarEmojiCategory[] = [
  {
    label: 'People',
    emojis: ['🧑‍🌾', '👨‍🌾', '👩‍🌾', '🧑', '👦', '👧', '🧒', '🧑‍🦱', '🧑‍🦳', '🧑‍🦰', '👴', '👵'],
  },
  {
    label: 'Plants & Trees',
    emojis: ['🌱', '🌳', '🌲', '🎋', '🌵', '🪵', '🌿', '🌸', '🍁', '🌴', '🌻', '🍂', '🌼', '💐', '🍀'],
  },
  {
    label: 'Animals & Birds',
    emojis: ['🦋', '🐝', '🐞', '🐢', '🦔', '🐿️', '🦊', '🐰', '🦌', '🐦', '🦉', '🐌'],
  },
  {
    label: 'Fruits',
    emojis: ['🍎', '🍊', '🍇', '🍑', '🍒', '🍐', '🫐'],
  },
  {
    label: 'Nature & Sky',
    emojis: ['🌍', '🌎', '🌏', '☀️', '🌤️', '⛅', '🌈', '⭐', '✨', '🌙', '💚', '💧'],
  },
];
