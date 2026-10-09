import { q, s, SeedLesson } from './lessonHelpers';
import { IMAGES } from './lessonImages';

// Full-length articles, part E. See longLessonsA.ts for the markdown conventions.

const photo = (name: keyof typeof IMAGES, alt: string, caption: string) => ({ ...IMAGES[name], alt, caption });
type Section = ReturnType<typeof s> & { image?: ReturnType<typeof photo> };
const sec = (heading: string, body: string, image?: ReturnType<typeof photo>): Section => ({ ...s(heading, body), ...(image ? { image } : {}) });

export const LONG_E: SeedLesson[] = [
  {
    key: 'home_composting',
    title: 'From Peel to Plant Food: A Beginner\'s Guide to Composting at Home',
    emoji: '🪱',
    tag: 'Waste',
    summary: 'Nearly half of what we throw away can turn into dark, crumbly soil food. Here is how to compost in a flat, a house or a balcony, and how to fix it when it goes wrong.',
    readMinutes: 8,
    heroImage: photo(
      'compostHeap',
      'A mound of dark, crumbly compost on a lawn with a spade stuck in the ground beside it',
      'A heap of finished compost. This is roughly what a household of two can produce in a year, according to the photographer.',
    ),
    sections: [
      sec(
        'The most satisfying thing in your kitchen',
        `Every day your kitchen produces a small pile of things you think of as rubbish: onion skins, mango stones, tea leaves, eggshells, the ends of vegetables, wilted coriander. On their own, they are smelly, wet and awkward.\n\nBut put them together in the right way, and something remarkable happens. Within weeks, billions of tiny living things, bacteria, fungi, insects and worms, quietly eat the pile and turn it into **compost**: a dark, crumbly, earthy-smelling material that plants love. You have taken something you were paying to throw away and made it into something gardeners buy.\n\nThis is not a new trick. It is exactly what happens on a forest floor, where fallen leaves and branches become the soil that feeds the trees above. Composting simply invites that process into your home.\n\n!stat ~50% | or more of household waste in Indian cities is organic, so wet waste is the biggest single piece of the rubbish puzzle`,
      ),
      sec(
        'The secret is balance: greens and browns',
        `Compost is a mix of two kinds of material, and the whole craft is getting the balance right.\n\n- **Greens** are wet and rich in nitrogen: vegetable and fruit peels, tea leaves, coffee grounds, fresh garden clippings, cut flowers. They feed the microbes and make the pile heat up.\n- **Browns** are dry and rich in carbon: dry leaves, shredded paper and cardboard, sawdust, coconut coir, straw. They soak up moisture, add structure and let air flow through.\n\nA good starting rule is about **two parts brown to one part green**, by volume. Too many greens and you get a wet, smelly slime. Too many browns and nothing happens because there is not enough to feed the microbes.\n\nA third ingredient is **air**. The microbes that make good, sweet-smelling compost need oxygen, so the pile must not be packed down tight. Turning it regularly lets air in. A fourth is **moisture**: it should feel like a wrung-out sponge, damp but never dripping.`,
      ),
      sec(
        'What goes in and what stays out',
        `### Good for a home bin\n- Vegetable and fruit peels and scraps\n- Tea leaves and coffee grounds, eggshells (crushed)\n- Dry leaves, shredded paper, cardboard, coconut coir\n- Cut flowers and garden trimmings\n- Small amounts of citrus and onion (they break down slowly but are fine)\n\n### Keep out\n- **Meat, fish, bones and dairy.** They smell and attract rats, flies and dogs.\n- **Oily or cooked food in large amounts.** It turns the pile greasy and slow.\n- **Pet waste and diseased plants.**\n- **Anything plastic**, including "biodegradable" bags and tea bags with plastic in them. A stray bit of plastic will stay in your compost forever.\n- **Glossy paper** and treated wood.\n\nIf you want to compost cooked food, dairy and small amounts of meat, a **bokashi** system, which ferments waste in a sealed bucket with a special bran, is designed for exactly that.`,
        photo(
          'compostBins',
          'Two wooden slatted compost bins in a backyard, one filled with dry leaves and one with spring plants growing in it',
          'Slatted wooden compost bins let air flow in. Dry leaves layered with kitchen scraps are the classic mix.',
        ),
      ),
      sec(
        'Pick a method that fits your home',
        `You do not need a garden. You need only to choose the method that matches your space.\n\n### A pot or bin on a balcony\nA lidded bucket or crate with air holes, a layer of browns at the bottom, then scraps, then a covering of browns. Keep it in the shade. This is the simplest method, and it works well for small households.\n\n### Vermicomposting\nSpecial composting worms, which are not the same as ordinary garden earthworms, live in a bin and eat your scraps, turning them into rich castings. It is fast, tidy, and works well indoors or on a balcony if you keep it shaded and moist. Many gardeners consider it the best compost there is.\n\n### Bokashi\nA sealed bucket where waste ferments with a special bran. The fermented waste is buried in soil or added to a larger compost pile afterwards. Good for cooked food and small amounts of dairy and meat.\n\n### A community pit or shared composter\nIf you live in an apartment with no space, ask your housing society about a shared composter, or find a municipal or private wet-waste collection service that composts instead of dumping.\n\nThe best method is the one you will keep going.`,
        photo(
          'vermicompost',
          'Four open woven sacks filled with dark, finished vermicompost on bare ground',
          'Bags of finished vermicompost, ready to use. Worms turn kitchen and farm waste into this nutrient-rich material.',
        ),
      ),
      sec(
        'When things go wrong, and how to fix them',
        `Nearly every beginner hits one of these. None of them is a disaster.\n\n- **It smells bad.** It is too wet or has too many greens. Add dry leaves, shredded paper or coir, and mix in air.\n- **Fruit flies hover around it.** Scraps are exposed. Cover each new batch with a layer of browns, and keep the lid on.\n- **Nothing is happening.** It may be too dry, too cold or have too many browns. Sprinkle water, add some fresh greens and mix.\n- **It is full of ants.** It is probably too dry. Moisten it and turn it.\n- **It has a white fuzzy mould.** That is normal and a good sign: fungi are at work.\n- **Maggots or rats.** Meat, dairy or cooked food got in. Remove them, add browns and keep the lid secure.\n\nFinished compost is dark brown, crumbly and smells like a forest after rain. You cannot recognise what went into it, apart from a few eggshell fragments or twigs, which you can sieve out and put back in the next batch.`,
      ),
      sec(
        'Using your compost, and why it matters',
        `Mix a few handfuls into potting soil, spread a layer around the base of plants, or use it to fill a new pot. It improves the soil's structure, helps it hold moisture and feeds plants slowly. Think of it as a soil conditioner more than a fertiliser: it makes plants resilient rather than giving a quick boost.\n\nThe benefits ripple outward. Every kilo of food waste you compost is a kilo that is **not** going to a dump, where it would produce methane. It cuts the load on municipal collection. It makes your own plants happier, and if you have no plants, a neighbour or a local park will gladly take it.\n\nIt also changes how you see your kitchen. Peels and scraps are no longer rubbish. They are **raw material**. And that small shift in thinking, from throwing away to returning, is what a more sustainable way of living looks like.`,
      ),
    ],
    takeaway: 'Balance wet scraps with dry leaves or paper, keep it airy and damp, and keep meat and dairy out: in a few weeks your peels become plant food.',
    quiz: [
      q('What are "browns" in composting?', 'Dry, carbon-rich materials like dry leaves and shredded paper', ['Wet vegetable peels', 'Meat scraps', 'Plastic bags'], 'Browns balance the wet greens and let air flow through.'),
      q('What is a good starting ratio of browns to greens?', 'About two parts brown to one part green', ['All greens', 'All browns', 'One part brown to ten parts green'], 'Roughly two parts brown to one part green keeps compost balanced.'),
      q('What should compost feel like?', 'Damp like a wrung-out sponge', ['Dripping wet', 'Bone dry', 'Hot and sticky'], 'Too wet gets smelly; too dry stops working.'),
      q('Which item should stay out of a basic home compost bin?', 'Meat and dairy', ['Tea leaves', 'Vegetable peels', 'Dry leaves'], 'Meat and dairy smell and attract pests.'),
      q('What should you do if your compost smells bad?', 'Add dry browns and mix in air', ['Add more wet scraps', 'Seal it tightly', 'Add meat'], 'A bad smell usually means too wet or too many greens.'),
    ],
    sourceNote: 'Standard home-composting guidance used by municipal and horticultural bodies; organic share of urban waste is a commonly cited estimate (varies by city).',
  },
  {
    key: 'move_smarter',
    title: 'Getting Around Without Wrecking the Air: A Practical Guide to Low-Carbon Travel',
    emoji: '🚌',
    tag: 'Travel',
    summary: 'How you move through your city is one of the biggest choices you make each day. A look at the real trade-offs between metros, buses, bikes, two-wheelers and cars, and how to make the better option the easier one.',
    readMinutes: 7,
    heroImage: photo(
      'delhiMetro',
      'A silver Delhi Metro train with a yellow stripe stopped at a station platform, with passengers walking along it',
      'A Delhi Metro train at a platform. A single full metro train can replace thousands of car trips.',
    ),
    sections: [
      sec(
        'The commute that eats your day',
        `Imagine two ways of crossing the same city. In one, you sit alone in a car in a slow river of other cars, each also carrying one or two people, breathing exhaust, burning fuel while standing still. In the other, you ride a train that glides above the traffic, with a few hundred people around you, and you step out at a station close to your destination.\n\nThe distance is the same. But the difference in what it does to the air, the climate, your wallet and your stress is large.\n\nTransport is one of the largest sources of greenhouse gases, and in cities it is also a leading source of the fine particles that make air unhealthy. Most of those emissions come from petrol and diesel vehicles that move one or two people at a time. Changing how you travel, even partly, is one of the highest-impact choices open to an individual.`,
      ),
      sec(
        'A rough ranking, from lightest to heaviest',
        `Per person and per kilometre, the options line up roughly like this:\n\n- **Walking and cycling.** Essentially zero emissions, and they keep you fit. Best for short trips.\n- **Metro, suburban trains and electric trains.** Very low emissions per passenger because they carry so many people, and they have almost no tailpipe pollution. Their footprint depends on how clean the electricity grid is.\n- **Buses, especially full ones.** Low per passenger, and they get better the fuller they are. A bus can replace dozens of cars.\n- **Shared autos, cabs and carpools.** Better than going alone, because the emissions are split.\n- **Two-wheelers.** Use far less fuel than cars, but they still pollute, and older two-stroke engines are especially dirty.\n- **Cars with one person.** Among the least efficient ways to move around a city.\n- **Flying.** The highest emissions per kilometre of all.\n\n!stat 1 bus | can take dozens of cars off a road when it is reasonably full`,
        photo(
          'bestBus',
          'A yellow and red double-decker BEST bus on a street in Mumbai with heritage buildings behind it',
          'A BEST double-decker bus in Mumbai. Public buses move far more people per litre of fuel than cars.',
        ),
      ),
      sec(
        'What about electric vehicles?',
        `Electric vehicles have no exhaust pipe, which cleans up the air in streets where they run. Over their whole lives, including making the battery and charging them, they are usually responsible for lower emissions than petrol or diesel vehicles. But how much lower depends on how the electricity is made. As more of India's power comes from solar, wind and other clean sources, the advantage grows.\n\nAn electric vehicle is a good upgrade if you must drive or ride. But it does not fix everything. It still takes up road space, still creates tyre and road dust, and still needs materials to build. **The cleanest kilometre is the one you do not need to drive.**`,
      ),
      sec(
        'The first and last kilometre',
        `Most people do not avoid public transport because they dislike trains and buses. They avoid it because of the awkward ends of the journey: the walk to the station on a broken pavement, the wait in the sun, the final stretch to the office.\n\nSolving the first and last kilometre is the key.\n\n- **Walk it if the route is safe and shaded**, or find a safer route even if it is slightly longer.\n- **Cycle to the station.** Many stations have cycle parking, and a bicycle extends your reach well beyond a walk.\n- **Use a shared auto or e-rickshaw** for the stretch in between.\n- **Use apps** that show bus and metro timings so that waiting is shorter and less uncertain.\n\nCities can help too. Footpaths that are actually walkable, protected cycle tracks, bus lanes and safe crossings are what turn "I could use the metro" into "I use the metro".`,
        photo(
          'cyclists',
          'Three cyclists riding along a wide road toward a glowing sunrise in New Delhi',
          'Cyclists in Hauz Khas, New Delhi, riding toward the low sun. Cycling is most pleasant where traffic is light and the road is safe.',
        ),
      ),
      sec(
        'Small changes that add up',
        `You do not have to give up your vehicle to make a difference. These smaller habits all help.\n\n- **Pick one trip a week** and change it: walk, cycle, take the bus or metro, or share the ride.\n- **Combine errands** into a single loop instead of several separate trips.\n- **Carpool** with a colleague or neighbour. Splitting a trip halves the emissions per person and the cost.\n- **Work from home** one or two days a week, if your job allows, which removes entire trips.\n- **Keep your vehicle in good shape.** Properly inflated tyres and a tuned engine use less fuel, and a valid pollution-under-control certificate means your vehicle is not emitting more than it should.\n- **Switch off at long red lights** and avoid unnecessary idling.\n- **Fly less often but stay longer,** and take a train for medium distances when you can.`,
      ),
      sec(
        'Speaking up for better streets',
        `Your own choices matter, but the options you have depend on the streets around you. People only walk when pavements are safe, only cycle when they are protected from fast traffic, and only take buses when they are frequent and reliable.\n\nThat is why a great deal of the work is **civic**. Ask your local body for continuous footpaths, safe crossings, cycle tracks and more buses. Support employers who offer shuttles and flexible hours. Notice which streets feel good to be on, and say so.\n\nThe cities we love, with lively pavements, short journeys and clean air, are not accidents. They are built by people who decided that getting around should be easy for everyone, not just for the person in the car. You can be one of them, starting with the next trip you take.`,
      ),
    ],
    takeaway: 'Choose the lightest option for each trip, fix the first and last kilometre, and ask for streets that make walking, cycling and public transport easy.',
    quiz: [
      q('Which is generally the highest-emission way to travel per kilometre?', 'Flying', ['Walking', 'Metro', 'Cycling'], 'Air travel has the highest emissions per kilometre.'),
      q('Why can a full bus be better for the climate than cars?', 'Its emissions are shared among many passengers', ['It uses no fuel', 'It is quieter', 'It is always electric'], 'Per passenger, a full bus emits far less than separate cars.'),
      q('What is true of electric vehicles?', 'They usually have lower lifetime emissions, depending on how clean the electricity is', ['They create no emissions of any kind', 'They are worse than all petrol cars', 'They do not need roads'], 'Their advantage grows as the electricity grid gets cleaner.'),
      q('What often stops people using public transport?', 'The awkward first and last kilometre', ['The trains being too quiet', 'The seats being too comfortable', 'Having too few tickets'], 'Poor footpaths, waits and final stretches put people off.'),
      q('Which habit helps cut emissions from a vehicle?', 'Keeping tyres properly inflated and the engine tuned', ['Driving faster', 'Idling for long', 'Carrying extra weight'], 'Good maintenance reduces fuel use and pollution.'),
    ],
    sourceNote: 'General transport-emissions comparisons (IPCC and IEA summaries); lifecycle analyses of electric vehicles. Per-passenger emissions vary by occupancy, vehicle and grid.',
  },
];
