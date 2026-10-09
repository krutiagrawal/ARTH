import { q, s, SeedLesson } from './lessonHelpers';
import { IMAGES } from './lessonImages';

// Full-length articles, part B. See longLessonsA.ts for the markdown conventions.

const photo = (name: keyof typeof IMAGES, alt: string, caption: string) => ({ ...IMAGES[name], alt, caption });
type Section = ReturnType<typeof s> & { image?: ReturnType<typeof photo> };
const sec = (heading: string, body: string, image?: ReturnType<typeof photo>): Section => ({ ...s(heading, body), ...(image ? { image } : {}) });

export const LONG_B: SeedLesson[] = [
  {
    key: 'hidden_water',
    title: 'The Water You Never See: What a T-Shirt and a Plate of Rice Really Cost',
    emoji: '💧',
    tag: 'Water',
    summary: 'You use far more water than comes out of your taps. Most of it is hidden inside the food you eat and the things you wear, and learning to see it changes how you shop.',
    readMinutes: 7,
    heroImage: photo(
      'paddyFlooded',
      'A large flooded rice field under a cloudy sky with palm trees in the distance, in Karnataka, India',
      'A flooded paddy field in Raichur district, Karnataka, during the monsoon. Rice is grown standing in water for much of its life.',
    ),
    sections: [
      sec(
        'Count the water in your morning',
        `Wake up and brush your teeth: a few litres, if you leave the tap running. Take a bucket bath or a shower: some more. Make chai, wash the vessels, flush. If you are curious and generous, you might guess you use a couple of hundred litres of water in your home each day.\n\nNow count the water you did not see. The milk in your tea came from an animal that drank water and ate fodder that was irrigated. The rice and dal on your plate were grown in fields that were watered for weeks or months. The cotton in your shirt, the paper in your notebook and the steel in your tiffin all took water to produce.\n\nScientists call this your **water footprint**: all the fresh water used to produce the goods and services you use. It is often many times larger than the water you use directly at home. That hidden part is where the biggest savings, and the biggest surprises, are.`,
      ),
      sec(
        'Three colours of water',
        `Water footprints are usually described in three colours, and it helps to know them because they explain why the numbers you read online can look so different.\n\n- **Green water** is rain that falls on a field and is held in the soil for plants to use. It is "free" in the sense that nobody pumps it, but it could have been used by other plants or forests.\n- **Blue water** is taken from rivers, lakes, canals and groundwater, usually through irrigation or industry. This is the water that runs short, and it is the one that matters most in places where wells are drying up.\n- **Grey water** is the amount of clean water needed to dilute the pollution a process creates until it is safe again.\n\nA kilo of rice grown mainly on monsoon rain has a very different effect on rivers and wells from a kilo grown in a region where farmers pump groundwater for months. That is why you will see different numbers in different studies. Use them to **compare** foods and products, not as exact measurements.`,
      ),
      sec(
        'The thirsty plate',
        `Here are some commonly cited estimates. They vary by place and method, but they show the order of magnitude:\n\n!stat ~2,700 L | the water often quoted for making one cotton T-shirt, from growing the cotton to the finished garment\n\n- **Rice:** roughly 2,500 litres for a kilogram, much of it blue water in irrigated regions.\n- **Beef:** around 15,000 litres for a kilogram, mostly the water used to grow animal feed.\n- **Pulses, millets and most vegetables:** far less per kilogram than rice or meat, and they often grow well on rainfall alone.\n\nRice deserves a closer look in India, where it is a staple and a major crop. Much of the country's rice is grown in states such as Punjab and Haryana in flooded fields watered by pumped groundwater. Over decades, this has contributed to falling water tables in those regions. It does not mean rice is "bad". It means that **where and how** a crop is grown matters as much as what the crop is, and that eating a variety of grains, including millets, takes pressure off the most stressed regions.`,
        photo(
          'paddyBorehole',
          'Rows of young rice seedlings in a flooded field, with a metal irrigation pipe from a borehole at the edge',
          'Newly planted rice in Raichur, Karnataka, irrigated from a borehole. Pumped groundwater is a major source for Indian farms.',
        ),
      ),
      sec(
        'Why the numbers sit in your wardrobe',
        `Clothes surprise people the most. A cotton shirt is a plant product, and cotton is a thirsty crop. On top of the water to grow it, there is water to spin, weave, dye and finish the cloth. Dyeing and finishing are also where a lot of **grey water** is created: coloured, chemical-laden wastewater that must be treated or it pollutes rivers.\n\nThere is a simple consequence. The water in a T-shirt is spent when the shirt is **made**. Wearing it for a year, or five, or passing it on to a cousin does not use any more. So the longer you keep clothes, the lower the water cost per wearing. A shirt worn 100 times has a footprint per wear a hundred times smaller than one worn once and thrown away.`,
      ),
      sec(
        'Habits that save water you cannot see',
        `You do not need to give up rice or clothes. You need to waste less of the water already inside them.\n\n- **Finish what you cook.** Food waste is water waste. Every roti thrown away took water to grow, mill and cook.\n- **Eat a wider mix.** More pulses, vegetables and millets in the week lowers your water footprint and often your costs.\n- **Wear things longer.** Mend, alter, swap and hand down. Before buying a new item, ask how many times you will wear it.\n- **Buy fewer, better things.** The footprint of a durable item is spread over its whole life.\n- **Choose what you eat with the season.** Crops that grow in their natural season often need less irrigation.`,
      ),
      sec(
        'And at home, where the water is visible',
        `The water you can see still matters, especially in cities where supply is limited.\n\n- Close the tap while brushing, soaping and scrubbing. This saves several litres each time.\n- Fix a dripping tap. A drip can waste thousands of litres over a year.\n- Use a bucket and mug, or a short shower, instead of a long shower or tub.\n- Run washing machines only with full loads.\n- Reuse water that is already clean enough: the water you washed vegetables in for plants, and the reject water from an RO purifier for mopping and cleaning, but not for drinking or cooking.\n\nTaken together, these small habits make a real dent in a household's use. But the larger lesson is the one hidden in the shirt and the plate: **every product is stored water**. Once you see it that way, wasting a meal or an outfit starts to feel like leaving a tap running.`,
      ),
    ],
    takeaway: 'Most of your water use is hidden in food and clothes, so wasting less and using things longer is one of the best ways to save water.',
    quiz: [
      q('What is a "water footprint"?', 'All the fresh water used to produce the goods and services you use', ['Only the water from your tap', 'The water in your drinking glass', 'The rain on your roof'], 'It counts hidden water in food, clothes and products, which is usually larger than direct use.'),
      q('Which water is taken from rivers, canals and groundwater for irrigation or industry?', 'Blue water', ['Green water', 'Grey water', 'Black water'], 'Blue water is the surface and groundwater that can run short.'),
      q('Roughly how much water is commonly cited for making one cotton T-shirt?', 'About 2,700 litres', ['About 27 litres', 'About 270 litres', 'About 2 litres'], 'This widely cited estimate includes growing the cotton and processing the cloth.'),
      q('Why does wearing a shirt for longer lower its water footprint per wear?', 'The water was spent making it, so more wears spread that cost out', ['Washing it gives water back', 'Old shirts need no water', 'It dries faster'], 'The footprint is fixed when the shirt is made; more wears means less per wear.'),
      q('Which is a good way to save hidden water?', 'Finish your food and eat more pulses and millets', ['Buy a new outfit each week', 'Leave leftovers to spoil', 'Run half-empty washing loads'], 'Wasting less and eating lower-water foods cuts the water behind your meals.'),
    ],
    sourceNote: 'Water Footprint Network and WWF commonly cited estimates (figures vary by region, crop and method); Central Ground Water Board.',
  },
  {
    key: 'catch_the_rain',
    title: 'Catching the Monsoon: The Old Art and New Need of Rainwater Harvesting',
    emoji: '🌧️',
    tag: 'Water',
    summary: 'Most of India\'s rain falls in four months, and most of it runs away. From stepwells to rooftop pits, here is how to keep some of it.',
    readMinutes: 8,
    heroImage: photo(
      'rooftopHarvest',
      'A black water tank on a stand beside old yellow buildings, with pipes leading from the roof to the tank',
      'A rooftop rainwater harvesting system in West Bengal: roof pipes lead water into a storage tank.',
    ),
    sections: [
      sec(
        'Four months of plenty',
        `Stand on any terrace in India on a July afternoon and watch the rain come down. In a few minutes, the roof is running like a river. The water pours off the edge, down the pipe, across the courtyard, into the drain and out into the city's rivers, and it is gone.\n\nThis is the paradox at the heart of India's water problem. A very large share of the country's rain, roughly three-quarters, falls in the four monsoon months from June to September. For the remaining eight months, the country depends on what it managed to store. And much of what falls in those four months is **not** stored. It runs off hard surfaces, floods low-lying streets, and reaches the sea.\n\nMeanwhile, in many places the groundwater that wells and borewells depend on is falling. India is the largest user of groundwater in the world. Pumping more water out than the rain puts back is a debt, and in some cities the borewells now have to go hundreds of feet deeper than they did a generation ago.\n\n!stat ~75% | of India's annual rainfall arrives in the four monsoon months, June to September`,
      ),
      sec(
        'Catching rain is not a new idea',
        `Long before pumps and pipes, India's people were expert rain catchers.\n\nIn Gujarat and Rajasthan, great **stepwells** (baolis and vavs) were dug deep into the ground so that water could be reached by long flights of steps even as the level dropped through the dry months. Chand Baori in Rajasthan has thousands of narrow steps descending in geometric patterns to a pool far below. In Rajasthan's villages, earthen check dams called **johads** hold back monsoon water so it can soak into the ground and fill wells downstream. In Tamil Nadu, networks of **eris** (tanks) stored water for farms and towns. In the desert, covered tanks called **kunds** collected rain from specially prepared surfaces.\n\nThese structures did more than store water. They recharged groundwater, cooled the air, and gave communities a shared place and shared responsibility. In Alwar district in Rajasthan, the revival of johads by community groups, led by Rajendra Singh, helped bring water back to villages that had run dry, and earned him the nickname "the Waterman of India".`,
        photo(
          'chandBaori',
          'A deep stepwell with many flights of stone steps descending in tiers, with arched galleries around the top',
          'Chand Baori in Rajasthan, one of India\'s deepest stepwells. Its steps let people reach the water however far it fell.',
        ),
      ),
      sec(
        'How a rooftop system works',
        `You do not need to dig a stepwell. A rooftop system on an ordinary house or building has just a few parts:\n\n- **The catchment** is the roof, whatever its size. Even a small terrace can collect thousands of litres in a good monsoon.\n- **Gutters and downpipes** carry the water from the roof.\n- **A first-flush diverter** throws away the first few minutes of rain. These minutes wash dust, bird droppings and leaves off the roof, and you do not want them in your tank.\n- **A filter** removes leaves and sand from the rest.\n- **Storage or recharge.** The clean water goes either into a tank for later use, or down a recharge pit or well into the ground, topping up the water table.\n\nStored rain is wonderful for gardening, washing, cleaning and flushing, and it is soft water that is kind to pipes and clothes. If you want to drink it, it needs proper treatment first. Whichever you choose, clean the roof and the filters before each monsoon so that the first rain does not carry a year of dirt into your system.`,
      ),
      sec(
        'Store it or sink it?',
        `There are two broad goals, and they work together.\n\n### Store it\nA tank gives you water you can **use directly** in the weeks after rain. This is helpful when municipal supply is irregular, and it cuts the amount of water you draw from tankers or borewells.\n\n### Sink it\nA recharge pit or recharge well sends water **underground**, where it spreads into the aquifer. This does not give you a bucket of water today, but it raises the level in nearby wells and borewells over time, and reduces flooding on your street. It is the better option where tank space is limited, and it benefits your neighbours too.\n\nSome cities have made harvesting a requirement. Chennai made it compulsory for new buildings in 2003, and other cities, including Bengaluru, require it for larger plots. It is worth checking the rules where you live. If you own or manage a building, a well-designed system can pay back its cost in saved water and fewer tanker visits.`,
        photo(
          'johad',
          'A calm pond at dusk with sky reflected in the water and small trees along the far shore, in Rajasthan',
          'A nadi, a small johad, in village Laporiya in Rajasthan. Village ponds like this hold monsoon water so it can soak into the ground.',
        ),
      ),
      sec(
        'What you can do even if you live in a flat',
        `You may not control a roof, but you can still help.\n\n- **Ask your housing society** whether the building has a harvesting system and whether it works. Many were built to meet a rule and then neglected. Cleaning the filters and pits before the rains costs little.\n- **Leave soil open.** Replace some paving in courtyards and driveways with permeable paving or plants, so that rain can soak in instead of rushing off.\n- **Use a bucket.** Even a bucket under a downpipe provides water for plants.\n- **Protect the village pond, lake or tank near you.** These are the largest storage and recharge structures a city has.\n- **Use less.** The cheapest water to find is the water you do not need to pump.`,
      ),
      sec(
        'Why this matters beyond your own tap',
        `Catching rain is not only about having water at home. When many roofs and plots hold back rainwater instead of sending it all into drains at once, street flooding goes down and the groundwater that wells and borewells depend on goes up. Cities that treat rain as a **resource** instead of a nuisance are more resilient to both floods and droughts.\n\nThe oldest builders of stepwells and johads understood this. They did not fight the monsoon. They designed their villages and cities to welcome it, hold it and share it. That idea is as practical now as it was a thousand years ago.\n\nThe next time it rains hard, go out and watch where the water goes. Then ask a simple question: **could this have stayed?**`,
      ),
    ],
    takeaway: 'Rain that is caught or sunk is a resource; rain that runs off is a flood and a loss. Even a small roof or pit can turn a few weeks of monsoon into months of water security.',
    quiz: [
      q('Roughly how much of India\'s annual rainfall arrives during the monsoon months?', 'About three-quarters', ['About 5 percent', 'About a tenth', 'Almost none'], 'About 75 percent of the year\'s rain falls from June to September.'),
      q('What does a first-flush diverter do?', 'Discards the dirty first minutes of rain from the roof', ['Heats the water', 'Adds salt to the water', 'Stores water for years'], 'The first rain washes dust and droppings off the roof, so it is thrown away.'),
      q('What is a johad?', 'An earthen check dam or pond that holds monsoon water', ['A type of tractor', 'A metal water pipe', 'A rooftop solar panel'], 'Johads hold rain so it soaks into the ground and fills wells.'),
      q('What is the main purpose of a recharge pit?', 'To send rain underground to top up the water table', ['To burn waste', 'To grow rice', 'To cool the roof'], 'Recharge pits help water seep into the aquifer.'),
      q('Which country is the world\'s largest user of groundwater?', 'India', ['Iceland', 'Norway', 'New Zealand'], 'India extracts more groundwater than any other country.'),
    ],
    sourceNote: 'India Meteorological Department monsoon climatology; Central Ground Water Board; Tamil Nadu rainwater harvesting ordinance (2003); community johad revival in Alwar (Tarun Bharat Sangh).',
  },
];
