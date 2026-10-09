import { q, s, SeedLesson } from './lessonHelpers';
import { IMAGES } from './lessonImages';

// Full-length articles, part C. See longLessonsA.ts for the markdown conventions.

const photo = (name: keyof typeof IMAGES, alt: string, caption: string) => ({ ...IMAGES[name], alt, caption });
type Section = ReturnType<typeof s> & { image?: ReturnType<typeof photo> };
const sec = (heading: string, body: string, image?: ReturnType<typeof photo>): Section => ({ ...s(heading, body), ...(image ? { image } : {}) });

export const LONG_C: SeedLesson[] = [
  {
    key: 'vampire_power',
    title: 'Vampire Power: The Quiet Drain on Your Electricity Bill',
    emoji: '🔌',
    tag: 'Energy',
    summary: 'Walk through your home at night and count the glowing lights. Each one is a small but steady sip of electricity. Here is how to find them, switch them off and cut the bigger costs too.',
    readMinutes: 7,
    heroImage: photo(
      'standbyLight',
      'A close-up of a power button and a green standby light on a black electronic device',
      'The little green light that never goes out: a device on standby is still drawing power.',
    ),
    sections: [
      sec(
        'The night-time walk',
        `Tonight, before you sleep, turn off the lights and walk through your home. Count the small glowing dots. The red light on the TV. The blue one on the set-top box. The green ring on the phone charger. The clock on the microwave. The router, the speaker, the printer, the gaming console in the corner.\n\nEach of those lights is telling you the same thing: **this device is still using electricity, even though you are not using it.** Engineers call it standby power. Everyone else calls it vampire power, because it feeds quietly while the house sleeps.\n\nIndividually, each device draws very little. A phone charger left plugged in with no phone may use a fraction of a watt. A set-top box can use a few watts continuously, even when the TV is off. But a house has dozens of them, and they run for twenty-four hours a day, every day of the year. Across a household, standby loads are often estimated at roughly 5 to 10 percent of the electricity bill.\n\n!stat 5-10% | the share of a home's electricity often estimated to go to devices that are switched "off" but still plugged in`,
      ),
      sec(
        'The usual suspects',
        `Not every device is equal. These are the ones worth checking first:\n\n- **Set-top boxes and DVRs.** Many are designed to stay on all day so they can download programme guides and record shows. Some use nearly as much power when "off" as when you are watching.\n- **Game consoles in instant-on mode.** The convenience of waking quickly can mean the console stays half awake all night.\n- **Smart TVs with quick-start features.**\n- **Chargers and adapters.** Small, but dozens of them add up across a family.\n- **Printers, speakers, microwaves and old audio systems.**\n- **Wi-Fi routers.** These need to stay on, but they do not need to be on when everyone is away for a week.\n\nThe only way to be sure is to measure. A **plug-in energy meter** costs a few hundred rupees and shows exactly how many watts a device uses when it is "off". Many people are startled to discover that a device they never think about uses more power asleep than a bulb does when lit.`,
        photo(
          'powerStrip',
          'A white power strip with several plugs and a red switch, with cables spread across a wooden floor',
          'A power strip with a switch lets you cut power to a whole group of devices in one click.',
        ),
      ),
      sec(
        'How to starve the vampires',
        `You do not need to unplug everything every night. A few small changes do most of the work.\n\n- **Use a switched power strip** for the TV, set-top box, console and sound system. One click when you leave or go to bed cuts the power to all of them.\n- **Unplug chargers** when they are not in use. A charger left in the wall draws a little power even with no phone attached.\n- **Turn off at the wall, not just the remote**, for devices you will not use for a day or more.\n- **Switch off "instant-on" or "quick-start" modes** in the settings of consoles and TVs, unless you truly need them.\n- **Put routers and boxes on a timer** if you are away for long.\n\nAn easy way to make this stick is to put the switch somewhere you naturally pass, such as by the bedroom door. If it is easy, you will do it.`,
      ),
      sec(
        'Light: the easiest upgrade in the house',
        `If you only do one thing after reading this, replace any remaining old bulbs with LEDs. An LED uses at least **75 percent less electricity** than an old filament bulb to give the same light, and it lasts many times longer, so you replace it less often. It also gives off much less heat, which matters in an Indian summer when every bit of heat from a bulb has to be cooled by a fan or air conditioner.\n\nLEDs are no longer a luxury. They cost little, and they pay back their price quickly in bills. When buying, check the brightness in **lumens**, not just the watts, and choose the colour that suits the room: warm white for bedrooms, cooler white for kitchens and study tables.`,
        photo(
          'ledBulbs',
          'A selection of LED light bulbs and lamps of different shapes arranged on a black surface',
          'LED lamps come in many shapes and sockets, and use at least 75% less energy than old filament bulbs.',
        ),
      ),
      sec(
        'Reading the star label',
        `When you buy an appliance in India, you will often find a **star label** from the Bureau of Energy Efficiency (BEE). It rates the appliance from 1 to 5 stars. More stars mean it uses less electricity to do the same job.\n\nA higher-star fridge or air conditioner usually costs more up front, but the saving shows up every month on the bill. Over the life of an appliance that runs for ten years or more, the cheaper model can turn out to be the more expensive one. Compare two models side by side: look at the stars and the annual energy use printed on the label, then work out roughly how many years it takes for the savings to cover the extra price. Often it is less than you expect.\n\nA few other notes on the biggest users:\n\n- **Air conditioners.** The Government of India has advised a default setting of 24 degrees Celsius, which balances comfort and savings. A ceiling fan running alongside lets you feel cool at a slightly higher setting. Clean the filters regularly and service the unit before summer.\n- **Refrigerators.** Keep the door seals clean and tight, let hot food cool before putting it in, and do not leave the door open.\n- **Geysers.** Use a timer, set a moderate temperature, and consider a solar water heater, which is a cheap and reliable way to cut winter bills.`,
      ),
      sec(
        'Why this matters beyond the bill',
        `Most of India's electricity still comes from burning coal, so every unit you do not use is carbon you do not release and air pollution you do not add. Saving electricity is one of the few environmental actions that **pays you back**: lower bills, a cooler house, longer-lasting appliances.\n\nAnd it scales. If every home cut its standby use by even a few percent, the savings would add up to the output of power plants that never need to be built.\n\nSo tonight, take the walk. Count the lights. Switch off what you can, and put the strip by the door. It is the closest thing to free money that your living room has to offer.`,
      ),
    ],
    takeaway: 'Devices on standby quietly use electricity all day: switch them off at the strip, use LEDs and compare star labels, and your bill and your footprint both shrink.',
    quiz: [
      q('What is "vampire power"?', 'Electricity used by devices that are switched off or on standby but still plugged in', ['Power from solar panels', 'Power generated at night', 'A type of battery'], 'Devices on standby keep drawing small amounts of power around the clock.'),
      q('How much less electricity do LEDs use than old filament bulbs?', 'At least 75 percent less', ['About the same', 'About 10 percent less', 'More'], 'LEDs are far more efficient than filament bulbs.'),
      q('What is a switched power strip useful for?', 'Cutting power to several devices with one click', ['Charging devices faster', 'Making devices brighter', 'Storing electricity'], 'It lets you switch off a group of devices at once.'),
      q('How many stars is the most efficient BEE rating?', '5', ['1', '3', '10'], 'Five stars means the appliance uses the least electricity.'),
      q('What default air-conditioner setting has the Government of India advised?', '24 degrees Celsius', ['16 degrees Celsius', '18 degrees Celsius', '30 degrees Celsius'], 'A setting of 24°C balances comfort and savings.'),
    ],
    sourceNote: 'Bureau of Energy Efficiency (BEE) star labelling programme; Ministry of Power AC default-setting advisory; US Department of Energy on LED efficiency; general estimates of standby electricity use (figures vary by home).',
  },
  {
    key: 'food_waste',
    title: 'The Plate and the Planet: Why Wasted Food Is a Climate Problem',
    emoji: '🍛',
    tag: 'Food',
    summary: 'Every roti in the bin took land, water, fuel and effort to make. Cutting food waste is one of the most powerful and least glamorous things any household can do.',
    readMinutes: 7,
    heroImage: photo(
      'vegWaste',
      'Goats eating discarded vegetables and waste on a street next to an auto rickshaw, in a market in Hyderabad',
      'Vegetable waste dumped beside a market in Hyderabad. Food is lost at every step between the field and the plate.',
    ),
    sections: [
      sec(
        'The thing in the back of the fridge',
        `You know the one. The half bottle gourd that was going to be a sabzi. The bunch of spinach that has turned to green liquid. The rice from two days ago that nobody wanted. It goes into the bin with a small pang of guilt, and then you forget about it.\n\nThat little pang is a good instinct, because what you have just thrown away is not only food. It is **land** that was cleared and ploughed, **water** that was pumped and poured, **seed**, **fertiliser**, **diesel** for the tractor, **electricity** for storage, **fuel** for the truck, and **the work** of a farmer, a trader, a shopkeeper and a cook. When food is wasted, all of that is wasted with it.\n\nThe United Nations Environment Programme estimates that roughly **17 percent** of the food available to consumers worldwide is thrown away, and households are the biggest source, responsible for around 60 percent of that waste, more than shops or restaurants.\n\n!stat 17% | of food available to consumers worldwide goes to waste, and most of it is thrown away in homes`,
      ),
      sec(
        'Why wasted food heats the planet',
        `Food waste matters for the climate in two ways.\n\nFirst, all the **emissions that went into producing it** are wasted. Growing, processing, packaging and transporting food releases greenhouse gases, and if the food is never eaten, those emissions bought nothing. If food waste were a country, it would rank among the biggest emitters on Earth.\n\nSecond, **what happens to it afterwards**. Food that ends up in a dump or landfill rots without air and produces **methane**, a greenhouse gas many times more powerful than carbon dioxide over a short period. Food scraps that are composted instead break down in the presence of air and return nutrients to the soil.\n\nAnd there is a human side. Many people in India and elsewhere do not get enough to eat. Wasting food in one place while others go hungry is a failure of the system, and one that each household can make a small dent in.`,
      ),
      sec(
        'Where it is lost',
        `Waste does not only happen in your kitchen. Food is lost at almost every stage:\n\n- **On farms**, when produce is left unharvested because prices are too low, or damaged by weather and pests.\n- **In storage and transport**, where poor cold storage, rough handling and long journeys cause spoilage.\n- **In markets and shops**, where bruised or unusual-looking items are discarded.\n- **In restaurants, canteens and weddings**, where large portions and buffets lead to plates left half full and trays of surplus food.\n- **At home**, where we buy too much, store things badly, cook too much or do not use leftovers.\n\nYou cannot fix every stage. But the last one belongs to you, and it is the largest.`,
        photo(
          'vegMarket',
          'Women selling vegetables from baskets and mats on a street in Ahmedabad, with a girl sitting beside them',
          'Vegetable sellers in Ahmedabad. Fresh produce spoils quickly, so buying what you will actually use matters.',
        ),
      ),
      sec(
        'Make your kitchen waste less',
        `### Plan before you shop\n- Look in the fridge and shelves before leaving home.\n- Write a short list, and plan a few meals around what you already have.\n- If you often buy too much, buy smaller amounts more often.\n\n### Store smarter\n- Wrap leafy greens in a damp cloth and keep them in the fridge. Keep onions and potatoes cool, dark and apart from each other.\n- Freeze what you cannot finish: overripe bananas, leftover bread, extra cooked dal, grated coconut.\n- Follow **first in, first out**: when you put new groceries away, move older items to the front.\n\n### Cook and serve with care\n- Cook a little less and top up if needed. Serve small portions first.\n- Turn leftovers into something new: day-old rice into fried rice or kheer, stale bread into toast or upma, leftover vegetables into parathas.\n- Cool cooked food quickly and refrigerate it within a couple of hours, and reheat it thoroughly before eating.\n\n### Read the date properly\n"**Best before**" is about quality. Food is often fine after that date if it looks, smells and tastes normal. "**Use by**" is about safety, and you should respect it. Sniff, look and taste before you bin.`,
      ),
      sec(
        'Beyond your own kitchen',
        `- **At restaurants**, order smaller portions or half plates, share dishes, and take leftovers home.\n- **At weddings and events**, estimate guests carefully and plan for surplus. Food-rescue groups such as Robin Hood Army and Feeding India collect safe, unused food and give it to people who need it.\n- **When you shop**, buy odd-shaped fruit and vegetables that taste exactly the same. They are often the ones that get thrown away.\n- **Compost what you cannot avoid.** Peels, scraps and tea leaves can become compost, which returns nutrients to soil rather than producing methane in a landfill.\n\nEvery meal you rescue also saves you money. A family that wastes a fifth of what it buys is paying for a lot of food it never eats.`,
      ),
      sec(
        'A week-long experiment',
        `If you want to see the effect for yourself, try this. For one week, put every bit of food you throw away into a separate container. At the end of the week, look at it. How much is it? What is it mostly: cooked food, vegetables, fruit, bread? Just seeing the pile will tell you where your biggest problem is.\n\nThen choose one thing to change. If it is half-used vegetables, shop less often. If it is leftover rice, cook less. If it is bread, freeze half the loaf. Do it for a week, and check again.\n\nFood waste can feel like a small matter. But it is one of the few climate problems where the fix is simple, the benefit is immediate, and everyone in the house can help. It starts with a plate, a fridge and a decision to finish what you have.`,
      ),
    ],
    takeaway: 'Plan, store and cook just enough, use leftovers, and compost the rest: stopping food waste at home saves money and cuts real emissions.',
    quiz: [
      q('Roughly what share of food available to consumers does UNEP estimate is wasted worldwide?', 'About 17 percent', ['About 1 percent', 'About 5 percent', 'About 60 percent'], 'UNEP\'s Food Waste Index estimates about 17 percent is wasted.'),
      q('Which group is responsible for the largest share of that waste?', 'Households', ['Farmers only', 'Airlines', 'Schools only'], 'Households account for around 60 percent of the waste UNEP counted.'),
      q('Why does food in a landfill harm the climate?', 'It rots without air and releases methane', ['It absorbs carbon dioxide', 'It produces oxygen', 'It cools the soil'], 'Methane is a powerful greenhouse gas produced by food rotting in dumps.'),
      q('What does "best before" on a label mainly indicate?', 'Quality rather than safety', ['The food is unsafe after that date', 'The food is free after that date', 'The food must be thrown away'], 'Many foods are fine after the best-before date if they look and smell normal.'),
      q('What is "first in, first out" in your kitchen?', 'Moving older items to the front and using them first', ['Eating only new food', 'Throwing out old food weekly', 'Cooking in order of colour'], 'Using older items first stops them spoiling at the back.'),
    ],
    sourceNote: 'UNEP Food Waste Index Report 2021 (data for 2019); FAO food loss and waste work. Figures are global estimates.',
  },
];
