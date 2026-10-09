// "True or Myth" statements. Keep these to well-established facts; `explanation` is shown after
// the play is finished.
export interface MythFact {
  statement: string;
  isTrue: boolean;
  explanation: string;
}

export const MYTH_FACTS: MythFact[] = [
  { statement: 'Bamboo is technically a type of grass.', isTrue: true, explanation: 'Bamboo belongs to the grass family, which is why it can grow so fast.' },
  { statement: 'All the oxygen we breathe comes from trees.', isTrue: false, explanation: 'A large share of Earth\'s oxygen comes from ocean plankton and algae, not just trees.' },
  { statement: 'Mangrove forests help protect coastlines from storms.', isTrue: true, explanation: 'Their dense roots slow waves and hold shoreline soil in place.' },
  { statement: 'Palm trees grow annual rings like an oak does.', isTrue: false, explanation: 'Palms are not true woody trees and do not form yearly growth rings.' },
  { statement: 'Planting trees in a city can lower local temperatures.', isTrue: true, explanation: 'Shade and the water vapour released by leaves cool the surrounding air.' },
  { statement: 'Eucalyptus is native to India.', isTrue: false, explanation: 'Eucalyptus (blue gum) comes from Australia and was introduced to India.' },
  { statement: 'Mulch helps soil hold on to moisture.', isTrue: true, explanation: 'A layer of mulch slows evaporation and keeps roots cooler.' },
  { statement: 'Plastic bags break down into soil within a few weeks.', isTrue: false, explanation: 'Plastic can take hundreds of years to break down and never becomes soil.' },
  { statement: 'Roots help hold soil in place and reduce erosion.', isTrue: true, explanation: 'A network of roots binds soil, especially on slopes and riverbanks.' },
  { statement: 'A banyan tree can grow new trunks from hanging aerial roots.', isTrue: true, explanation: 'Aerial roots reach the ground, thicken, and act like extra trunks.' },
  { statement: 'Counting the rings in a tree trunk can show its age.', isTrue: true, explanation: 'Most trees add one growth ring each year, so ring count tells age.' },
  { statement: 'Leaves are green because of a pigment called chlorophyll.', isTrue: true, explanation: 'Chlorophyll absorbs sunlight for photosynthesis and reflects green light.' },
  { statement: 'Planting any tree anywhere is always good for the environment.', isTrue: false, explanation: 'The right tree in the right place matters: wrong species can use too much water or harm local wildlife.' },
  { statement: 'Kitchen vegetable peels can be composted.', isTrue: true, explanation: 'Wet kitchen waste breaks down into nutrient-rich compost.' },
  { statement: 'Birds and bats help forests by spreading seeds.', isTrue: true, explanation: 'Animals eat fruit and drop the seeds far from the parent tree.' },
  { statement: 'Trees grow taller by adding height at their tips, not from the base.', isTrue: true, explanation: 'A nail hammered into a trunk stays at the same height as the tree grows.' },
  { statement: 'Watering a sapling a little every hour is better than a deep soak less often.', isTrue: false, explanation: 'Deep, less frequent watering encourages roots to grow downward.' },
  { statement: 'Tropical rainforests are found mostly near the equator.', isTrue: true, explanation: 'Warm temperatures and heavy rainfall near the equator support rainforests.' },
  { statement: 'Forests are home to most of the world\'s land-based plant and animal species.', isTrue: true, explanation: 'Forests shelter a large majority of terrestrial biodiversity.' },
  { statement: 'Cutting down one tree and planting one sapling instantly replaces everything the tree gave.', isTrue: false, explanation: 'A young sapling takes many years to match a mature tree\'s shade and carbon storage.' },
  { statement: 'Mangrove trees can live in salty water.', isTrue: true, explanation: 'Mangroves have special adaptations to tolerate salt.' },
  { statement: 'Neem has been used in traditional Indian medicine for centuries.', isTrue: true, explanation: 'Neem leaves, bark and oil have long been used in traditional remedies.' },
  { statement: 'Fallen leaves are useless waste and cannot be reused.', isTrue: false, explanation: 'Dry leaves can be composted or used as mulch.' },
  { statement: 'Old batteries are safe to throw in the wet-waste bin.', isTrue: false, explanation: 'Batteries are hazardous waste and need separate collection.' },
];
