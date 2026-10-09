import { q, s, SeedLesson } from './lessonHelpers';
import { IMAGES } from './lessonImages';

// Full-length articles, part D. See longLessonsA.ts for the markdown conventions.

const photo = (name: keyof typeof IMAGES, alt: string, caption: string) => ({ ...IMAGES[name], alt, caption });
type Section = ReturnType<typeof s> & { image?: ReturnType<typeof photo> };
const sec = (heading: string, body: string, image?: ReturnType<typeof photo>): Section => ({ ...s(heading, body), ...(image ? { image } : {}) });

export const LONG_D: SeedLesson[] = [
  {
    key: 'know_your_aqi',
    title: 'Reading the Air: What the AQI Really Tells You (and What to Do About It)',
    emoji: '🌫️',
    tag: 'Air',
    summary: 'A single number on your phone can tell you whether to jog, open the windows or wear a mask. Here is how to read it, why winters are worse and how to protect yourself and your home.',
    readMinutes: 8,
    heroImage: photo(
      'delhiSmog',
      'A wide view of a hazy, smog-covered city with buildings fading into grey-brown air',
      'Smog over Delhi in 2019. On the worst days, buildings in the distance disappear into the haze.',
    ),
    sections: [
      sec(
        'The morning you could not see the road',
        `If you have lived in north India in winter, you know the morning. You step outside and the world has shrunk. The building across the road is a grey shape. Your eyes sting. Your throat feels scratchy. The sun is a pale disc, and it is nine o'clock and still feels like dusk.\n\nThe air has become something you can see and taste. And behind that haze is a number your phone can show you in a second: the **Air Quality Index**, or AQI.\n\nThe AQI is a tool. It turns a long list of pollutants into one number and one colour so that you do not need a chemistry degree to decide whether it is a good day to run. Learning to read it is one of the simplest things you can do for your health.`,
      ),
      sec(
        'How to read the scale',
        `India's national AQI runs from 0 to 500. The higher the number, the worse the air and the bigger the risk.\n\n- **0 to 50, Good.** Minimal impact.\n- **51 to 100, Satisfactory.** Minor discomfort for very sensitive people.\n- **101 to 200, Moderate.** Breathing discomfort for people with lung, heart or other conditions.\n- **201 to 300, Poor.** Discomfort for most people on prolonged exposure.\n- **301 to 400, Very Poor.** Respiratory illness on prolonged exposure.\n- **401 to 500, Severe.** Affects healthy people and seriously affects those with existing conditions.\n\nThe AQI is calculated from several pollutants, and the one that is usually highest, and dominates the reading, is **PM2.5**.`,
      ),
      sec(
        'What is PM2.5?',
        `PM2.5 stands for particulate matter smaller than 2.5 micrometres across. To picture that, a human hair is about 70 micrometres thick, so you could line up nearly thirty of these particles across the width of a single hair.\n\nBecause they are so tiny, they do not get caught in the nose and throat the way larger dust does. They travel deep into the lungs, and the smallest can pass into the bloodstream. Over time, breathing them is linked to asthma and other lung problems, heart disease and stroke. Children, older people, pregnant women and people with existing conditions are the most vulnerable.\n\nWhere does it come from? A mix of sources, which differs by city and season: **vehicle exhaust, dust from roads and construction, burning of waste, industry and power plants, cooking fires, and smoke from crop residue and festival fireworks.**\n\n!stat ~30 | PM2.5 particles could be lined up across the width of one human hair`,
      ),
      sec(
        'Why winter is worse',
        `Pollution does not only depend on how much is released. It also depends on how much the air can carry away.\n\nOn cold, calm winter mornings, a layer of cooler air near the ground can sit under a warmer layer above it. Normally, warm air near the surface rises and carries pollutants up and away. In a **temperature inversion**, that lid holds everything down, and winds are too weak to blow it off. Smoke, dust and exhaust pile up close to the ground.\n\nIn north India, this coincides with extra smoke from **burning of crop residue** after the rice harvest in October and November, and from festival fireworks around Diwali. These add to the year-round sources of vehicles, dust and industry. That is why AQI so often climbs between October and January and why it improves when winds pick up or rain falls.`,
        photo(
          'stubbleBurning',
          'Farmers in turbans using sticks to tend a burning field of rice straw, with flames in the foreground',
          'Burning rice straw in Punjab before the wheat is sown. Many farmers say they have few affordable alternatives, which is why solutions must work for them too.',
        ),
      ),
      sec(
        'Protecting yourself on a bad air day',
        `You cannot clean a whole city, but you can lower your own exposure.\n\n- **Check the AQI** before you plan outdoor exercise, just as you check the weather. Official apps and websites publish readings for most large cities.\n- **Exercise indoors** when the AQI is Poor or worse. Heavy breathing pulls more particles deeper into your lungs.\n- **Avoid busy roads** at peak hours. Pollution is highest next to heavy traffic. A lane or a park path even a street away can be noticeably cleaner.\n- **Wear the right mask.** A well-fitted N95 or equivalent respirator filters fine particles effectively. Ordinary cloth and surgical masks do much less against PM2.5. A mask only helps if it seals around your nose and cheeks.\n- **Keep windows closed** during the worst hours, and ventilate when outdoor air improves, usually in the afternoon.\n- **Watch the vulnerable.** Children, older relatives and anyone with asthma or heart conditions should take extra care, and may need to stay in on the worst days.`,
        photo(
          'n95',
          'A light-blue N95 respirator mask with elastic straps on a black background',
          'An N95 respirator. It filters fine particles when it fits snugly; a loose mask lets polluted air slip around the edges.',
        ),
      ),
      sec(
        'Clean the air indoors too',
        `Indoor air is not automatically clean. Cooking smoke, incense, mosquito coils and candles all add particles, and outdoor pollution seeps in through gaps.\n\n- **Use an exhaust fan or chimney** while cooking, and open a window when the outdoor air is better.\n- **Skip burning** incense sticks and mosquito coils in closed rooms, or use them sparingly with ventilation.\n- **Consider an air purifier** with a HEPA filter in the room where you sleep, sized for the room, with windows closed. It helps most on severe days.\n- **Do not rely on houseplants.** Plants are lovely, but you would need a jungle to measurably clean a room's air.\n- **Damp-dust and mop** instead of sweeping dry, which throws particles back into the air.`,
      ),
      sec(
        'What you can do for everyone else\'s air',
        `The air belongs to everyone, so the biggest changes are shared ones.\n\n- **Never burn** leaves, plastic or rubbish. It is one of the easiest sources of pollution to stop, and it produces some of the most toxic smoke.\n- **Drive less.** Use public transport, carpool, walk or cycle when you can, and keep your vehicle tuned and its pollution certificate valid.\n- **Skip crackers** or choose far fewer, and support community celebrations that use lights instead of smoke.\n- **Ask for cleaner systems.** Support bus services, cleaner fuels, dust control at construction sites and support for farmers to manage crop residue without burning.\n\nBreathing is not something we can opt out of. The AQI is a way of saying: **look, this is what we are all breathing today**. It is also, over time, a way of holding ourselves to account for it.`,
      ),
    ],
    takeaway: 'Check the AQI like the weather, protect yourself with the right mask and indoor habits, and never add smoke by burning waste.',
    quiz: [
      q('What AQI range does India\'s scale cover?', '0 to 500', ['0 to 10', '0 to 100 only', '1 to 5'], 'India\'s AQI runs from 0 to 500; higher is worse.'),
      q('What does PM2.5 stand for?', 'Particles smaller than 2.5 micrometres', ['Pollution measured at 2.5 pm', 'A type of petrol blend', 'Pesticide mix 2.5'], 'These tiny particles can travel deep into the lungs.'),
      q('What is a temperature inversion?', 'Warm air above a cooler layer that traps pollution near the ground', ['Warm air rising quickly', 'A type of rain', 'A strong wind'], 'The warm layer acts like a lid and holds pollution down.'),
      q('Which mask protects best against fine particles when it fits well?', 'An N95-type respirator', ['A loose cloth mask', 'A paper napkin', 'A scarf'], 'N95 respirators filter fine particles if sealed to the face.'),
      q('What should you never do with leaves and rubbish?', 'Burn them', ['Compost clean leaves', 'Sort them', 'Hand them to the collector'], 'Open burning releases large amounts of harmful fine particles.'),
    ],
    sourceNote: 'Central Pollution Control Board, National Air Quality Index; WHO guidance on particulate matter. Details of local sources vary by city and season.',
  },
  {
    key: 'single_use_plastics',
    title: 'Beyond the Ban: The Everyday Plastic We Can Actually Do Without',
    emoji: '🥤',
    tag: 'Waste',
    summary: 'India banned a list of throwaway plastic items in 2022. Here is what is on the list, what is not, and the surprisingly old Indian habits that already solve the problem.',
    readMinutes: 7,
    heroImage: photo(
      'straws',
      'A bunch of brightly coloured plastic drinking straws standing upright against a pale background',
      'Plastic straws: used for a few minutes, made of material that lasts for centuries.',
    ),
    sections: [
      sec(
        'A straw, a spoon, a plate',
        `Picture a roadside stall at a fair. You buy a cold drink and it arrives with a plastic straw. You buy a plate of snacks and it comes on a plastic plate with a plastic spoon. You drink and eat for ten minutes and everything goes into the nearest overflowing bin.\n\nNone of those items is heavy or expensive. They are not even very useful: you could drink from a cup and eat with your fingers or a steel spoon. And yet billions of them are made, used once and thrown away. They are light, they blow around easily, they are too dirty and small to be worth recycling, and they end up in drains, rivers, fields and the stomachs of animals.\n\nThat is the logic behind a ban that India brought in on **1 July 2022**. It did not try to ban all plastic. It went after a list of items that are **low in usefulness but high in littering**.`,
      ),
      sec(
        'What is on the list',
        `The ban covers the manufacture, import, stocking, sale and use of identified single-use plastic items. They include:\n\n- Plastic sticks for **earbuds**, **balloons**, **flags**, **candy** and **ice-cream**\n- **Plates, cups, glasses and cutlery** such as forks, spoons and knives, and **straws, trays and stirrers**\n- **Thermocol (polystyrene)** for decoration\n- **Wrapping and packing films** around sweet boxes, **invitation cards** and cigarette packets, and **plastic or PVC banners** below a certain thickness\n\nThese items were chosen because there are easy alternatives: steel, glass, wood, paper without a plastic lining, leaves, and clay.\n\n!stat 1 Jul 2022 | the date India's ban on identified single-use plastic items took effect`,
      ),
      sec(
        'What the ban does not cover',
        `It is worth being honest about the gaps. The ban is a start, not a cure.\n\n- **Carry bags** are covered by separate thickness rules rather than this list.\n- **Multi-layer packaging**, such as chips, biscuit and sachet wrappers, is still everywhere, and it is hard or impossible to recycle in most places.\n- **Plastic bottles** remain widely used, though they are at least collected and recycled more often than thin items.\n\nTo deal with packaging, India introduced **Extended Producer Responsibility (EPR)** guidelines in 2022. They require the companies that put plastic packaging on the market to arrange for a share of it to be collected and recycled. It is a long road, and enforcement varies across states and cities, which is why individual choices still matter.`,
      ),
      sec(
        'Three myths about "better" plastic',
        `**"Biodegradable plastic fixes the problem."** Many products labelled biodegradable only break down in the high heat of industrial composting plants, not in a drain, a river or a roadside. Until they reach such a plant, they can still litter and still harm animals.\n\n**"Paper cups are plastic-free."** Most hot-drink paper cups are lined inside with a thin layer of plastic so that they do not leak. That lining makes them hard to recycle, and they usually end up with ordinary waste.\n\n**"Recycling will solve it."** Worldwide, less than a tenth of all the plastic ever produced has been recycled. A lot of plastic can only be recycled once or twice, and thin, dirty or multi-layer plastic is rarely worth collecting.\n\nThe most effective order is the one used by waste experts: **refuse first, reuse second, recycle last.**`,
      ),
      sec(
        'India\'s oldest answers',
        `Here is the good news. India did not invent disposable plastic, and its traditional habits already solve most of this problem.\n\nThink of the **kulhad**, the unglazed clay cup for chai. It is cheap, it keeps tea hot, it adds a faint earthy smell, and when it breaks it turns back into soil. Think of the **leaf plate**, made of sal or banana leaves stitched together, still used for feasts and temple meals. Think of the **steel tiffin** and the legendary **dabbawalas** of Mumbai, who move hundreds of thousands of reusable lunch boxes across the city every day.\n\nThese are not nostalgic tricks. They are tested, affordable, local systems that create jobs for potters, leaf-plate makers and delivery workers. Bringing them back is not a step backwards, it is the smartest forward move available.`,
        photo(
          'kulhad',
          'A top-down view of milky tea in a terracotta clay cup held in a hand',
          'Chai in a kulhad, an unglazed clay cup, in Varanasi. When it breaks it simply returns to the earth.',
        ),
      ),
      sec(
        'Your reusable starter kit',
        `You do not need to buy a lot. Gather a few things you probably already own, and keep them where you will use them.\n\n- **A bottle.** Steel or glass, filled at home or a safe refill point.\n- **A small cutlery set.** A spoon and a fork in a pouch is enough. Keep one in your office drawer and one in your bag.\n- **A cup or kulhad habit.** Carry a mug to the office, and choose a clay cup at the tea stall.\n- **A tiffin or container.** For takeaway food and leftovers, say "please put it in this".\n- **A cloth bag.** The one you already have.\n- **A "no straw" reflex.** Say it before the drink arrives, not after.\n\nOne person doing this saves hundreds of items in a year. A family or an office doing it together saves thousands. And every time you say "no, thanks", you quietly tell the person across the counter that customers care.`,
        photo(
          'dabbawala',
          'A man in a white cap beside a bicycle loaded with dozens of metal lunch tins in Mumbai',
          'A Mumbai dabbawala with reusable tiffin tins. The system has moved home-cooked lunches in steel containers for well over a century.',
        ),
      ),
    ],
    takeaway: 'Refuse the throwaway item first: a bottle, cup, spoon and tiffin of your own, plus the clay and leaf traditions India already has, replace almost everything on the ban list.',
    quiz: [
      q('When did India\'s ban on identified single-use plastic items start?', '1 July 2022', ['1 January 2000', '15 August 2010', '5 June 2030'], 'The ban on identified single-use plastic items took effect on 1 July 2022.'),
      q('Why were these particular items chosen?', 'They are low in usefulness but high in littering, with easy alternatives', ['They are made of metal', 'They are very expensive', 'They are heavy and hard to move'], 'They are used briefly, rarely recycled and easy to replace.'),
      q('What does Extended Producer Responsibility (EPR) require?', 'Companies to arrange for a share of the plastic packaging they sell to be collected and recycled', ['Shoppers to pay a tax', 'Shops to burn waste', 'Farmers to recycle bottles'], 'EPR puts responsibility for packaging on the companies that produce it.'),
      q('Why are many hot-drink paper cups hard to recycle?', 'They have a thin plastic lining inside', ['They are made of glass', 'They are too thick', 'They are made of metal'], 'The plastic lining stops leaks but makes recycling difficult.'),
      q('What is a kulhad?', 'An unglazed clay cup for chai', ['A steel tiffin box', 'A plastic bag', 'A type of straw'], 'A kulhad is a clay cup that returns to soil when it breaks.'),
    ],
    sourceNote: 'Plastic Waste Management (Amendment) Rules, 2021 and 2022 (single-use plastic list; EPR guidelines); Ministry of Environment, Forest and Climate Change; global recycling estimates (OECD, Geyer et al. 2017).',
  },
];
