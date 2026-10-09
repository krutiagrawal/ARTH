import { q, s, SeedLesson } from './lessonHelpers';
import { IMAGES } from './lessonImages';

// Full-length (Substack-style) articles. Body text is the light markdown described in
// apps/mobile/src/components/lesson/RichText.tsx: blank line = paragraph, "- " bullets, "> " pull
// quote, "### " sub-heading, "!stat value | label" callout, **bold**.

const photo = (name: keyof typeof IMAGES, alt: string, caption: string) => ({ ...IMAGES[name], alt, caption });
type Section = ReturnType<typeof s> & { image?: ReturnType<typeof photo> };
const sec = (heading: string, body: string, image?: ReturnType<typeof photo>): Section => ({ ...s(heading, body), ...(image ? { image } : {}) });

export const LONG_A: SeedLesson[] = [
  {
    key: 'sort_your_waste',
    title: 'The Three-Bin Habit: Why Sorting Your Waste Changes Everything',
    emoji: '🗑️',
    tag: 'Waste',
    summary: 'Before your rubbish leaves the house, it is still a resource. Here is how three bins turn into cleaner cities, cleaner air and better work for the people who handle our waste.',
    readMinutes: 7,
    heroImage: photo(
      'amritsarBins',
      'A blue bin and a green bin side by side on a busy street in Amritsar, India',
      'Paired public bins in Amritsar, Punjab. Under India\'s colour code, green is for wet waste and blue is for dry.',
    ),
    sections: [
      sec(
        'One kitchen, one morning',
        `Think about the first two hours of your day. A tea bag, a banana peel, the wrapper from a biscuit packet, a bit of leftover dal, the paper from yesterday's newspaper, the empty shampoo sachet, a dead battery from the TV remote. By nine o'clock all of it has gone into the same bin, and the bin has gone out of sight.\n\nMost of us never think about what happens next. That is the real problem with waste: our system is designed so that we do not have to. The bin is a magic trick. Things go in, and they vanish.\n\nThey do not vanish, of course. They travel. And where they travel, and what happens to them there, depends almost entirely on one small decision you make in the kitchen: **do you mix it, or do you separate it?**`,
      ),
      sec(
        'Where a mixed bin ends up',
        `In many Indian cities, mixed household waste is collected, driven to the edge of town and tipped onto a dump or landfill. If you have seen the huge waste hills at places like Ghazipur or Bhalswa in Delhi, you have seen the end of the road for a great deal of mixed waste.\n\nOnce there, the wet food scraps begin to rot without air. This produces **methane**, a greenhouse gas many times stronger than carbon dioxide over a short period. It also produces a dark, toxic liquid called leachate, which can seep into soil and groundwater. Heat and trapped gas can start fires that burn for days and fill nearby neighbourhoods with smoke.\n\nMeanwhile, everything useful in that heap, the clean paper, the metal tins, the plastic bottles, the glass, is soaked in food and smeared with grime. It becomes too dirty to sell. Material that could have earned money and been made into something new is simply buried.\n\n!stat 3 | streams of waste India's rules ask every household to separate: wet, dry and domestic hazardous`,
        photo(
          'recyclingBins',
          'Three colour-coded recycling bins labelled for cans, glass and plastic bottles, and paper',
          'Colour-coded bins make the right choice the easy one. The exact colours differ from country to country; what matters is that the streams stay apart.',
        ),
      ),
      sec(
        'The rule: wet, dry, hazardous',
        `India's Solid Waste Management Rules, 2016 ask households to hand over waste in separate streams. It sounds bureaucratic, but the logic is simple.\n\n### Wet waste\n- Vegetable and fruit peels, leftover food, tea leaves, eggshells\n- Garden leaves and cut flowers, including temple flowers\n- This can become **compost** or biogas, which means it goes back to the soil as food instead of rotting in a dump.\n\n### Dry waste\n- Paper, cardboard, newspapers and cartons\n- Plastic bottles, containers and wrappers, glass, metal tins and cans\n- Old cloth, footwear, rubber and thermocol\n- Clean and dry, this is **recyclable material** that dealers and recyclers pay for.\n\n### Domestic hazardous waste\n- Batteries, tube lights and CFL bulbs, expired medicines\n- Paint and pesticide containers, mosquito-repellent refills, and sanitary and diaper waste, which should be wrapped and handed over separately\n- These need special handling because they can poison people, soil and water if mixed with ordinary waste.\n\nLarge residential complexes and institutions that produce a lot of waste are expected to process their wet waste on site, for example with a composter, rather than sending it all out. If you live in one, your resident welfare association is the place to ask what system exists.`,
      ),
      sec(
        'Why wet and dry must never meet',
        `Think of a stack of old newspapers. Dry, they are worth a few rupees a kilo to the kabadiwala, who will sell them on to be turned into new paper. Soak the same stack in curry and it is rubbish.\n\nThe same goes for a plastic bottle. Rinsed and dropped into the dry bag, it is a valuable PET bottle. Left half full of cold drink and tossed in with fish scraps, it gets a layer of grease and bacteria, and the chances of it being recycled fall sharply.\n\n> Waste is not a thing. Waste is a mixing problem. Keep things apart and most of it is not waste at all.\n\nThe wet stream has the same logic in reverse. Compost needs clean organic material. A few torn plastic wrappers or a stray battery in a compost pit can ruin a whole batch and make it unsafe to put on plants.`,
      ),
      sec(
        'The people who make recycling work',
        `India's recycling system is not run by big machines. It is run by people: waste pickers, door-to-door collectors, kabadiwalas and small dealers who sort, bale and sell materials up a long chain to recyclers. Estimates of how many people depend on this informal work run into the lakhs, and many collect and sort for very little pay, often in unsafe conditions.\n\nWhen you hand over mixed waste, the first thing these workers must do is open it and pick through food scraps with bare hands. When you hand over clean, separate dry waste, you remove the worst part of their job and increase the value of what they collect.\n\nSome cities have started to include these workers formally. In Pune, the cooperative **SWaCH**, made up of waste pickers and collectors, provides door-to-door collection for lakhs of households and earns a fee from them and a share from selling recyclables. It is a good example of what happens when the people who understand waste best are part of the system rather than outside it.`,
      ),
      sec(
        'Myths worth dropping',
        `- **"It all gets mixed in the truck anyway."** In many cities collection is now done in separate compartments, vehicles or on separate days, and the rules require local bodies to collect segregated waste. If yours mixes it, that is a service failure you can report, not a reason to stop sorting.\n- **"Only rich countries can recycle."** India already recovers a large amount of material through informal networks. Clean, separate dry waste feeds that system.\n- **"I have no space for three bins."** You need two small containers and a box. A bucket for wet waste, a bag for dry, and a shoebox for batteries and bulbs is enough.\n- **"One person's effort makes no difference."** A single household that composts its wet waste keeps hundreds of kilos out of the dump each year. Multiply that by a building, and then a street.`,
      ),
      sec(
        'Start tomorrow in five minutes',
        `You do not have to overhaul your life. Try this order:\n\n- **Set up two containers** in the kitchen, one for wet and one for dry, and keep a small box for batteries, bulbs and medicines.\n- **Give your household a one-line rule.** "Anything that was food or a plant goes in wet. Everything else dry unless it is a battery, bulb or medicine."\n- **Rinse and dry** bottles, tins and containers before they go in the dry bag. A quick swirl is enough.\n- **Compost the wet bag** if you can: in a pot, a community pit or a wet-waste collection service.\n- **Hand over clean dry waste** to your collector or kabadiwala, and say thank you.\n\nIn a week the habit will feel automatic. In a month you will notice your bin is smaller and cleaner and your kitchen smells better. And somewhere beyond the gate, a person who sorts waste for a living has an easier day because of a decision you made in the kitchen.`,
      ),
    ],
    takeaway: 'Waste is mostly a mixing problem: keep wet, dry and hazardous apart at home and you protect the soil, the air and the people who handle your rubbish.',
    quiz: [
      q('How many streams do India\'s 2016 waste rules ask households to separate?', 'Three: wet, dry and domestic hazardous', ['One', 'Two: paper and everything else', 'Five'], 'Households are asked to separate wet, dry and domestic hazardous waste.'),
      q('What gas do rotting food scraps release in a dump?', 'Methane', ['Helium', 'Oxygen', 'Neon'], 'Food rotting without air produces methane, a potent greenhouse gas.'),
      q('Why does mixing wet and dry waste cause problems?', 'Dirty recyclables lose their value and become hard to recycle', ['It makes waste lighter', 'It makes compost faster', 'It has no effect'], 'Soaked paper and greasy plastic are hard to recycle, so far more gets dumped.'),
      q('What is SWaCH in Pune?', 'A cooperative of waste pickers and collectors', ['A type of compost bin', 'A government tax', 'A recycling machine'], 'SWaCH is a waste-picker cooperative that provides door-to-door collection.'),
      q('Where should expired medicines and batteries go?', 'In the domestic hazardous stream, kept separate', ['In the wet waste bin', 'Down the drain', 'Into the dry bag with bottles'], 'They are hazardous and need separate handling.'),
    ],
    sourceNote: 'Solid Waste Management Rules, 2016 (Government of India); SWaCH Pune; general waste-management research. Details of local collection vary by city.',
  },
  {
    key: 'plastic_bag_truth',
    title: 'The Plastic Bag: Minutes of Use, Centuries of Mess',
    emoji: '🛍️',
    tag: 'Waste',
    summary: 'It takes seconds to accept a carry bag and seconds to throw it away. Following one bag from the shop to the sea shows why the smallest habit might be one of the most powerful.',
    readMinutes: 7,
    heroImage: photo(
      'cocoBeach',
      'Plastic bottles and other litter scattered across a pebbly beach with a driftwood branch and the sea behind',
      'Plastic waste washed up at Coco Beach in Goa, where the Mandovi river meets the sea.',
    ),
    sections: [
      sec(
        'Follow one bag',
        `Imagine it is a Sunday evening. You stop at a vegetable stall, buy a kilo of tomatoes and a bunch of coriander, and the seller drops them into a thin plastic bag. You carry it for ten minutes, empty it into a basket at home, and screw the bag into a ball.\n\nThat bag has now done everything it will ever do for you. It worked for about ten minutes. But the bag itself is just getting started. It will sit in a bin, then a truck, then a dump or a drain, and it will stay there, in one form or another, for a very long time.\n\nPlastic does not rot the way a leaf does. Sunlight and heat make it brittle, and wind, water and trampling break it into smaller and smaller pieces. The pieces become tiny, but the plastic is still there. Estimates for how long a plastic bag lasts in the environment run from decades to centuries, depending on the conditions. Nobody has watched one disappear.\n\n!stat 10 min | the typical time a carry bag is used, against a lifespan in the environment that is measured in decades or more`,
      ),
      sec(
        'Where the bags go',
        `A thin, light bag is the first thing the wind takes. It escapes from overflowing bins, from open dumps and from the back of garbage trucks. It lands in trees, on railway tracks, in fields and, above all, in drains.\n\nDuring the monsoon this matters in a very practical way. Bags and other plastic packed into drains stop rainwater from flowing away, and streets flood faster. Cities spend a great deal of money and effort pulling plastic out of drains before the rains for exactly this reason.\n\nBags that make it past the drains go into streams and rivers, and rivers carry them to the sea. On beaches from Goa to Odisha, plastic is one of the most common things found on clean-up days. In the water, turtles and other sea animals can mistake floating bags for jellyfish and swallow them. On land, cattle and other animals eat bags along with food scraps, and the plastic can block their stomachs and make them very ill.`,
        photo(
          'landfillBuffalo',
          'A water buffalo standing in a field of plastic waste, with smoke and a person carrying a sack in the background',
          'A buffalo among plastic packaging at a waste site in India. Animals that forage in dumps swallow plastic along with their food.',
        ),
      ),
      sec(
        'Why a bag is so hard to recycle',
        `If bags are plastic, and plastic can be recycled, why do they pile up? Because recycling a thin bag does not make economic sense.\n\nA bag is very light, so it takes thousands of them to make a kilo. It is usually dirty from food or earth. It tangles in sorting machines. And the recycled plastic it yields is low in value. For a waste picker choosing what to collect, a heavy bottle or a bundle of cardboard pays far better than a pile of bags.\n\nThis is why India has set rules on thickness. The idea is that thicker bags are more likely to be reused and collected, and that the thinnest, most litter-prone ones should not be on the market at all. Thickness limits for carry bags were raised in steps, to 120 microns from the end of 2022. Rules help, but only when shops follow them and customers do not demand a free bag for every purchase.`,
      ),
      sec(
        'Cloth, paper or plastic? An honest comparison',
        `The fashionable answer is "switch to cloth". The honest answer is more interesting.\n\nEvery bag has an environmental cost to make. A cotton bag takes more energy and water to produce than a plastic bag, so a cotton bag only comes out ahead if you reuse it **many** times. Studies have given different numbers, from dozens to well over a hundred, depending on what exactly is measured. Paper bags are heavier to make and carry, and they tear in the rain.\n\nThe lesson is not that cloth is a trick. It is that **the best bag is the one you already own, used again and again**. A jute bag that lasts five years wins. A fashionable tote you buy and use twice loses. A thin plastic bag reused thirty times is better than a new "eco" bag that sits in a cupboard.`,
        photo(
          'juteStall',
          'Customers browsing a stall of jute and cloth bags at a book fair in Kolkata',
          'A stall of jute and cloth bags at the Kolkata Book Fair. Jute is a traditional Indian fibre that can be grown, spun and sewn locally.',
        ),
      ),
      sec(
        'What actually works',
        `- **Carry a bag, always.** Keep one in your office bag, scooter box, car boot or pocket. Fold-up bags are small and cheap. If the bag is not with you, you will take a new one.\n- **Say no to the second bag.** Shops often double-bag by habit. A simple "no bag needed, thanks" for one or two items works more often than people expect.\n- **Reuse what you have.** Keep the plastic bags already at home for bin liners, lunches and storage, and use them until they tear. Do not throw away a working bag to "go green".\n- **Bring containers.** For loose goods like sweets, dairy or meat, ask whether the shop will use your own box or bowl.\n- **Choose the heavier option.** If you must take a bag, a thicker, reusable one beats a flimsy one.\n- **Never burn them.** Burning plastic in the open releases toxic fumes and fine particles. Put bags in the dry waste instead so they have at least a chance of being collected.`,
      ),
      sec(
        'Small refusals, big pile',
        `It is easy to feel that your single bag cannot matter. But think about how a pile forms. Nobody dumps a mountain at once. It is made of billions of small, thoughtless moments, each as small as yours.\n\nThe good news is that the reverse is also true. Every bag you refuse is one that is never made, never carried, never blown into a drain and never swallowed by an animal. And habits spread. When a neighbour sees you pull out a cloth bag, or a shopkeeper notices that more customers bring their own, the norm shifts a little.\n\nNext time someone reaches for a thin carry bag, remember the beach at Coco Beach, the buffalo in the dump, the drain in the monsoon. Then ask yourself a simple question: **do I really need this for the next ten minutes?**`,
      ),
    ],
    takeaway: 'A bag you use for ten minutes can outlast you: carry your own, reuse what you have, and refuse the second bag.',
    quiz: [
      q('Why are thin carry bags so hard to recycle?', 'They are light, dirty and low in value', ['They are too heavy', 'They are made of glass', 'They melt in sunlight'], 'It takes thousands of bags to make a kilo and the recycled plastic is low in value.'),
      q('How can discarded bags make monsoon flooding worse?', 'By blocking drains', ['By absorbing water', 'By making rain heavier', 'By warming the air'], 'Plastic packed into drains stops water flowing away.'),
      q('When does a cloth bag become better than a plastic bag?', 'When it is reused many times', ['The first time it is used', 'Only when it is new', 'Never'], 'A cloth bag takes more resources to make, so it only pays off with many reuses.'),
      q('What is a good way to deal with plastic bags you already have at home?', 'Reuse them until they tear, then put them in the dry waste', ['Burn them', 'Bury them in the garden', 'Throw them in a river'], 'Reusing avoids new bags, and burning releases harmful fumes.'),
      q('What can happen when animals eat plastic bags with food scraps?', 'The plastic can block their stomachs', ['They get stronger', 'They digest it fully', 'It turns into fat'], 'Plastic can block an animal\'s digestive system and make it very ill.'),
    ],
    sourceNote: 'Plastic Waste Management (Amendment) Rules, 2021 (thickness rules); life-cycle comparisons of carry bags (UK Environment Agency 2011 and later reviews, figures vary widely); general plastics research.',
  },
];
