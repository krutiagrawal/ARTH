// "Sort the Waste": items for the Wet / Dry / Hazardous bins used in Indian household segregation.
export const WASTE_BINS = ['Wet waste', 'Dry waste', 'Hazardous'] as const;

export interface WasteItem {
  emoji: string;
  name: string;
  /** Index into WASTE_BINS. */
  bin: 0 | 1 | 2;
  note: string;
}

export const WASTE_ITEMS: WasteItem[] = [
  { emoji: '🍌', name: 'Banana peel', bin: 0, note: 'Food scraps are wet waste and can be composted.' },
  { emoji: '🥬', name: 'Vegetable scraps', bin: 0, note: 'Kitchen scraps compost well.' },
  { emoji: '🥚', name: 'Eggshells', bin: 0, note: 'Eggshells are compostable.' },
  { emoji: '🍊', name: 'Fruit rinds', bin: 0, note: 'Fruit rinds are wet waste.' },
  { emoji: '🍛', name: 'Leftover cooked food', bin: 0, note: 'Cooked leftovers go with wet waste.' },
  { emoji: '💐', name: 'Wilted flowers', bin: 0, note: 'Flowers are biodegradable wet waste.' },
  { emoji: '🍂', name: 'Garden leaves', bin: 0, note: 'Garden waste can be composted.' },
  { emoji: '☕', name: 'Used tea leaves', bin: 0, note: 'Tea leaves are great for compost.' },
  { emoji: '🧴', name: 'Plastic bottle', bin: 1, note: 'Clean plastic bottles are recyclable dry waste.' },
  { emoji: '📰', name: 'Old newspaper', bin: 1, note: 'Paper is dry, recyclable waste.' },
  { emoji: '📦', name: 'Cardboard box', bin: 1, note: 'Cardboard is recyclable dry waste.' },
  { emoji: '🍾', name: 'Glass bottle', bin: 1, note: 'Glass is dry waste and can be recycled again and again.' },
  { emoji: '🥫', name: 'Metal tin can', bin: 1, note: 'Metal cans are recyclable dry waste.' },
  { emoji: '👕', name: 'Old t-shirt', bin: 1, note: 'Cloth is dry waste (better: donate or reuse it).' },
  { emoji: '🛍️', name: 'Plastic carry bag', bin: 1, note: 'Plastic bags are dry waste; reuse them where possible.' },
  { emoji: '🧃', name: 'Juice carton', bin: 1, note: 'Cartons are dry waste.' },
  { emoji: '👟', name: 'Worn-out shoes', bin: 1, note: 'Footwear is dry waste.' },
  { emoji: '🔋', name: 'Used batteries', bin: 2, note: 'Batteries contain toxic metals and need hazardous collection.' },
  { emoji: '📱', name: 'Broken phone', bin: 2, note: 'Electronics are e-waste and need special disposal.' },
  { emoji: '💡', name: 'CFL / tube light', bin: 2, note: 'Some contain mercury, so they are hazardous.' },
  { emoji: '💊', name: 'Expired medicines', bin: 2, note: 'Medicines should not go in ordinary bins.' },
  { emoji: '🎨', name: 'Old paint can', bin: 2, note: 'Paint is hazardous chemical waste.' },
  { emoji: '🔌', name: 'Dead phone charger', bin: 2, note: 'Cables and chargers are e-waste.' },
  { emoji: '🌡️', name: 'Mercury thermometer', bin: 2, note: 'Mercury is toxic and hazardous.' },
  { emoji: '🧪', name: 'Pesticide bottle', bin: 2, note: 'Pesticides are hazardous chemicals.' },
  { emoji: '💉', name: 'Used syringe', bin: 2, note: 'Sharps are biomedical hazardous waste.' },
];
