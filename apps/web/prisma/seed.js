const { PrismaClient } = require('@plant/db')

const prisma = new PrismaClient()

// Image URLs previously indexed via lib/data.js `IMAGES.<category>[n]`. Denormalized
// here into a direct `imageUrl` string per row instead of shipping index arrays to Postgres.
const IMAGES = {
  forests: [
    'https://images.pexels.com/photos/880675/pexels-photo-880675.jpeg',
    'https://images.pexels.com/photos/29054973/pexels-photo-29054973.jpeg',
    'https://images.pexels.com/photos/8513289/pexels-photo-8513289.jpeg',
    'https://images.pexels.com/photos/4279380/pexels-photo-4279380.jpeg',
    'https://images.pexels.com/photos/27815694/pexels-photo-27815694.jpeg',
    'https://images.pexels.com/photos/37735974/pexels-photo-37735974.jpeg',
    // Appended (not reordered) so existing rows' `img` indices below keep pointing
    // at the same photo — this batch only adds variety for new rows and the
    // detail page's "more from the ground" gallery strip.
    'https://images.pexels.com/photos/775201/pexels-photo-775201.jpeg',
    'https://images.pexels.com/photos/707915/pexels-photo-707915.jpeg',
    'https://images.pexels.com/photos/1671324/pexels-photo-1671324.jpeg',
    'https://images.pexels.com/photos/338936/pexels-photo-338936.jpeg',
    'https://images.pexels.com/photos/957024/forest-trees-perspective-bright-957024.jpeg',
    'https://images.pexels.com/photos/15286/pexels-photo.jpg',
    'https://images.pexels.com/photos/33109/fall-autumn-red-season.jpg',
    'https://images.pexels.com/photos/1179229/pexels-photo-1179229.jpeg',
    'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg',
    'https://images.pexels.com/photos/167698/pexels-photo-167698.jpeg',
  ],
  legacy: [
    'https://images.pexels.com/photos/33723074/pexels-photo-33723074.jpeg',
    'https://images.pexels.com/photos/34166902/pexels-photo-34166902.jpeg',
    'https://images.pexels.com/photos/34552300/pexels-photo-34552300.jpeg',
    'https://images.pexels.com/photos/38714805/pexels-photo-38714805.jpeg',
  ],
  blogs: [
    'https://images.pexels.com/photos/5285554/pexels-photo-5285554.jpeg',
    'https://images.pexels.com/photos/34730467/pexels-photo-34730467.jpeg',
    'https://images.pexels.com/photos/29849379/pexels-photo-29849379.jpeg',
    'https://images.pexels.com/photos/8134646/pexels-photo-8134646.jpeg',
  ],
}

const STATS = [
  { label: 'Trees Planted', value: 1284730, suffix: '' },
  { label: 'Volunteers', value: 84210, suffix: '' },
  { label: 'NGOs', value: 612, suffix: '' },
  { label: 'Cities', value: 214, suffix: '' },
  { label: 'Species', value: 3480, suffix: '' },
  { label: 'CSR Partners', value: 148, suffix: '' },
  { label: 'Nurseries', value: 372, suffix: '' },
  { label: 'Communities', value: 1290, suffix: '' },
]

const FORESTS = [
  { id: 'aravali-grove', name: 'Aravali Grove', location: 'Rajasthan, India', state: 'Rajasthan', trees: 42180, volunteers: 812, species: 74, established: '2019', img: 0, story: 'A restoration effort in the arid Aravali range, transforming rocky soil into a thriving native forest of dhok, ronjh and neem.' },
  { id: 'whispering-ghats', name: 'Whispering Ghats', location: 'Kerala, India', state: 'Kerala', trees: 68240, volunteers: 1420, species: 212, established: '2017', img: 1, story: 'A canopy of endemic species in the Western Ghats – one of the world\'s eight hottest biodiversity hotspots.' },
  { id: 'himalayan-cradle', name: 'Himalayan Cradle', location: 'Uttarakhand, India', state: 'Uttarakhand', trees: 29870, volunteers: 640, species: 88, established: '2020', img: 2, story: 'Oak and rhododendron forests at 2,200m – home to musk deer, monal pheasants and a hundred quiet streams.' },
  { id: 'mangrove-mile', name: 'Mangrove Mile', location: 'Sundarbans, India', state: 'West Bengal', trees: 51200, volunteers: 980, species: 46, established: '2018', img: 3, story: 'A coastal buffer of Sundari trees restoring the tidal edge and sheltering nesting spoonbills.' },
  { id: 'red-earth-woods', name: 'Red Earth Woods', location: 'Bandhavgarh, India', state: 'Madhya Pradesh', trees: 33940, volunteers: 512, species: 92, established: '2021', img: 4, story: 'Sal and mahua woodland regeneration adjoining a tiger reserve buffer zone.' },
  { id: 'monsoon-canopy', name: 'Monsoon Canopy', location: 'Meghalaya, India', state: 'Meghalaya', trees: 47510, volunteers: 720, species: 168, established: '2016', img: 5, story: 'One of the wettest places on earth – a living cathedral of ferns, moss and living root bridges.' },

  // Smaller, newer plantation drives — grown to bring every state and union
  // territory onto the map, not just the six flagship forests above.
  { id: 'tidal-shade-nursery', name: 'Tidal Shade Nursery', location: 'Port Blair, India', state: 'Andaman & Nicobar Island', trees: 3200, volunteers: 64, species: 18, established: '2021', img: 0, story: 'A shoreline mangrove nursery replanting the tidal buffer that cyclones and old jetties wore away.' },
  { id: 'godavari-greenline', name: 'Godavari Greenline', location: 'Rajahmundry, India', state: 'Andhra Pradesh', trees: 15400, volunteers: 310, species: 41, established: '2020', img: 1, story: 'A riverbank plantation along the Godavari, holding the soil where the water used to take it.' },
  { id: 'eastern-hill-nursery', name: 'Eastern Hill Nursery', location: 'Ziro, India', state: 'Arunanchal Pradesh', trees: 6100, volunteers: 90, species: 37, established: '2019', img: 2, story: 'A community-tended grove above the Ziro valley, grown alongside the paddies rather than instead of them.' },
  { id: 'brahmaputra-belt', name: 'Brahmaputra Belt', location: 'Jorhat, India', state: 'Assam', trees: 18900, volunteers: 402, species: 52, established: '2018', img: 3, story: 'A flood-plain planting drive holding sandbars together for the rhinos and the tea gardens both.' },
  { id: 'gangetic-grove', name: 'Gangetic Grove', location: 'Bhagalpur, India', state: 'Bihar', trees: 9800, volunteers: 210, species: 29, established: '2021', img: 4, story: 'Fruit and shade trees planted along a stretch of the Ganga that had gone bare for a generation.' },
  { id: 'bastar-canopy', name: 'Bastar Canopy', location: 'Jagdalpur, India', state: 'Chhattisgarh', trees: 11200, volunteers: 180, species: 44, established: '2020', img: 5, story: 'A tribal-led sal forest restoration returning income and shade to villages on the forest\'s edge.' },
  { id: 'auroville-greenbelt', name: 'Auroville Greenbelt', location: 'Puducherry, India', state: 'Puducherry', trees: 5400, volunteers: 140, species: 63, established: '2016', img: 0, story: 'A dense, deliberately overplanted belt turning eroded red earth back into a living forest floor.' },
  { id: 'sutlej-shade-line', name: 'Sutlej Shade Line', location: 'Ludhiana, India', state: 'Punjab', trees: 7600, volunteers: 150, species: 22, established: '2022', img: 1, story: 'Windbreak and shade trees planted between the fields, grown to outlast the next stubble-burning season.' },
  { id: 'rhododendron-ridge', name: 'Rhododendron Ridge', location: 'Yuksom, India', state: 'Sikkim', trees: 4200, volunteers: 85, species: 58, established: '2019', img: 2, story: 'A high-altitude restoration on the old Kanchenjunga trail, replanted one monsoon at a time.' },
  { id: 'nilgiri-shola-patch', name: 'Nilgiri Shola Patch', location: 'Coonoor, India', state: 'Tamil Nadu', trees: 13500, volunteers: 260, species: 71, established: '2017', img: 3, story: 'A shola-grassland mosaic restoration, coaxing back a forest type most maps had already given up on.' },
  { id: 'leisure-valley-line', name: 'Leisure Valley Line', location: 'Chandigarh, India', state: 'Chandigarh', trees: 2100, volunteers: 48, species: 19, established: '2022', img: 4, story: 'A city-planned green corridor, planted by residents on weekends between the sector roads.' },
  { id: 'deccan-scrub-revival', name: 'Deccan Scrub Revival', location: 'Warangal, India', state: 'Telangana', trees: 8700, volunteers: 175, species: 33, established: '2021', img: 5, story: 'A dry-deciduous revival on rocky Deccan scrubland everyone else had written off as unplantable.' },
  { id: 'agartala-bamboo-belt', name: 'Agartala Bamboo Belt', location: 'Agartala, India', state: 'Tripura', trees: 6800, volunteers: 120, species: 26, established: '2020', img: 0, story: 'A fast-growing bamboo and hardwood mix planted to stabilise hill slopes above the paddy fields.' },
  { id: 'terai-treeline', name: 'Terai Treeline', location: 'Pilibhit, India', state: 'Uttar Pradesh', trees: 21300, volunteers: 480, species: 39, established: '2018', img: 1, story: 'A buffer forest along the Terai grasslands, planted to widen the corridor tigers already use.' },
  { id: 'chilika-mangrove-fringe', name: 'Chilika Mangrove Fringe', location: 'Chilika, India', state: 'Odisha', trees: 9400, volunteers: 165, species: 24, established: '2019', img: 2, story: 'A lagoon-edge mangrove fringe replanted to slow the erosion eating into Chilika\'s fishing villages.' },
  { id: 'daman-ganga-corridor', name: 'Daman Ganga Corridor', location: 'Silvassa, India', state: 'Dadara & Nagar Havelli', trees: 2600, volunteers: 55, species: 21, established: '2021', img: 3, story: 'A riverside planting along the Daman Ganga, small but stubborn, holding its bank against the monsoon.' },
  { id: 'diu-coastal-strip', name: 'Diu Coastal Strip', location: 'Diu, India', state: 'Daman & Diu', trees: 1800, volunteers: 40, species: 15, established: '2022', img: 4, story: 'A salt-tolerant coastal planting breaking the wind before it reaches the old fort walls.' },
  { id: 'sahyadri-spice-grove', name: 'Sahyadri Spice Grove', location: 'Ponda, India', state: 'Goa', trees: 5200, volunteers: 110, species: 48, established: '2018', img: 5, story: 'A native canopy grown back over an old plantation, spice trees and forest trees sharing the same shade.' },
  { id: 'kutch-thorn-forest', name: 'Kutch Thorn Forest', location: 'Bhuj, India', state: 'Gujarat', trees: 7100, volunteers: 130, species: 20, established: '2020', img: 0, story: 'A dryland thorn-forest restoration in Kutch, proving green can still mean something in a desert.' },
  { id: 'aravalli-northern-tip', name: 'Aravalli Northern Tip', location: 'Gurugram, India', state: 'Haryana', trees: 9600, volunteers: 220, species: 27, established: '2019', img: 1, story: 'A forgotten stretch of the Aravallis, replanted by office volunteers one Saturday morning at a time.' },
  { id: 'deodar-slope', name: 'Deodar Slope', location: 'Kullu, India', state: 'Himachal Pradesh', trees: 8300, volunteers: 145, species: 34, established: '2017', img: 2, story: 'A deodar and oak slope replanted above an apple valley, to hold the snowmelt a little longer each spring.' },
  { id: 'dal-lake-catchment', name: 'Dal Lake Catchment', location: 'Srinagar, India', state: 'Jammu & Kashmir', trees: 6700, volunteers: 115, species: 31, established: '2020', img: 3, story: 'A catchment-area planting meant to slow the silt that has been quietly filling in Dal Lake for decades.' },
  { id: 'chota-nagpur-sal-line', name: 'Chota Nagpur Sal Line', location: 'Ranchi, India', state: 'Jharkhand', trees: 12400, volunteers: 240, species: 36, established: '2018', img: 4, story: 'A sal forest regrowth on reclaimed mining land, led by the villages the mines once displaced.' },
  { id: 'western-ghats-corridor', name: 'Western Ghats Corridor', location: 'Chikmagalur, India', state: 'Karnataka', trees: 16700, volunteers: 355, species: 84, established: '2016', img: 5, story: 'A wildlife corridor stitched back together between two coffee estates and a reserve forest.' },
  { id: 'agatti-coconut-shade', name: 'Agatti Coconut Shade', location: 'Agatti, India', state: 'Lakshadweep', trees: 1400, volunteers: 32, species: 9, established: '2022', img: 0, story: 'A coral-island planting of coconut and screwpine, roots doing double duty holding sand against the sea.' },
  { id: 'loktak-lakeside-grove', name: 'Loktak Lakeside Grove', location: 'Moirang, India', state: 'Manipur', trees: 4700, volunteers: 95, species: 28, established: '2021', img: 1, story: 'A lakeside grove planted to buffer Loktak\'s floating phumdis from the silt washing off the surrounding hills.' },
  { id: 'jhum-fallow-forest', name: 'Jhum Fallow Forest', location: 'Aizawl, India', state: 'Mizoram', trees: 5900, volunteers: 100, species: 42, established: '2019', img: 2, story: 'A regrowth planting on old jhum-cultivation land, giving the fallow years a forest instead of just a rest.' },
  { id: 'dzukou-approach-line', name: 'Dzukou Approach Line', location: 'Kohima, India', state: 'Nagaland', trees: 3900, volunteers: 78, species: 33, established: '2020', img: 3, story: 'A trailside planting on the approach to the Dzukou valley, grown by the villages that guide the trekkers through it.' },
  { id: 'yamuna-biodiversity-strip', name: 'Yamuna Biodiversity Strip', location: 'New Delhi, India', state: 'NCT of Delhi', trees: 6200, volunteers: 190, species: 25, established: '2021', img: 4, story: 'A native-species strip along the Yamuna floodplain, planted to outcompete the invasive weed that used to own it.' },

  // Second wave — a further planting in almost every state/UT above, so most
  // places on the map now have more than one forest to show.
  { id: 'thar-edge-nursery', name: 'Thar Edge Nursery', location: 'Jodhpur, India', state: 'Rajasthan', trees: 9200, volunteers: 175, species: 21, established: '2022', img: 6, story: 'A desert-edge nursery of khejri and rohida trees, holding the line where the Thar sands keep advancing.' },
  { id: 'periyar-buffer-line', name: 'Periyar Buffer Line', location: 'Thekkady, India', state: 'Kerala', trees: 7600, volunteers: 160, species: 55, established: '2021', img: 7, story: 'A buffer planting around Periyar\'s reserve edge, widening the forest\'s margin for the elephants that already cross it.' },
  { id: 'ganga-source-grove', name: 'Ganga Source Grove', location: 'Rishikesh, India', state: 'Uttarakhand', trees: 6400, volunteers: 130, species: 29, established: '2020', img: 8, story: 'A riverbank planting where the Ganga first reaches the plains, grown to slow the water before it floods downstream.' },
  { id: 'darjeeling-tea-shade', name: 'Darjeeling Tea Shade', location: 'Darjeeling, India', state: 'West Bengal', trees: 5100, volunteers: 95, species: 33, established: '2019', img: 9, story: 'Native shade trees replanted through an ageing tea estate, giving the soil roots again between the rows.' },
  { id: 'satpura-corridor', name: 'Satpura Corridor', location: 'Pachmarhi, India', state: 'Madhya Pradesh', trees: 10800, volunteers: 205, species: 47, established: '2020', img: 10, story: 'A wildlife corridor planting linking two fragments of the Satpura range back into one forest.' },
  { id: 'living-root-nursery', name: 'Living Root Nursery', location: 'Cherrapunji, India', state: 'Meghalaya', trees: 3400, volunteers: 70, species: 24, established: '2021', img: 11, story: 'A rubber-fig nursery raising the next generation of living root bridges, one aerial root at a time.' },
  { id: 'havelock-reef-shade', name: 'Havelock Reef Shade', location: 'Havelock Island, India', state: 'Andaman & Nicobar Island', trees: 1900, volunteers: 38, species: 12, established: '2022', img: 12, story: 'A beachfront planting shading the path down to the reef, roots holding the dune against the tide.' },
  { id: 'tirumala-hill-line', name: 'Tirumala Hill Line', location: 'Tirupati, India', state: 'Andhra Pradesh', trees: 6800, volunteers: 145, species: 28, established: '2021', img: 13, story: 'A hillside restoration on the pilgrim route up Tirumala, planted to outlast the millions of footsteps.' },
  { id: 'namdapha-buffer', name: 'Namdapha Buffer', location: 'Miao, India', state: 'Arunanchal Pradesh', trees: 4200, volunteers: 60, species: 51, established: '2020', img: 14, story: 'A buffer-zone planting on the edge of Namdapha, easing the pressure on one of India\'s last untouched forests.' },
  { id: 'kaziranga-grassland-edge', name: 'Kaziranga Grassland Edge', location: 'Kaziranga, India', state: 'Assam', trees: 5600, volunteers: 110, species: 22, established: '2019', img: 15, story: 'A treeline planted along Kaziranga\'s edge, giving the rhinos somewhere to shelter when the floods come.' },
  { id: 'valmiki-buffer-belt', name: 'Valmiki Buffer Belt', location: 'Bettiah, India', state: 'Bihar', trees: 4900, volunteers: 88, species: 26, established: '2021', img: 0, story: 'A young buffer forest along the Nepal border, planted to give Valmiki\'s tigers more room to roam.' },
  { id: 'kanger-valley-fringe', name: 'Kanger Valley Fringe', location: 'Kanger Valley, India', state: 'Chhattisgarh', trees: 5300, volunteers: 95, species: 36, established: '2022', img: 1, story: 'A limestone-cave valley fringe replanted after decades of quiet quarrying nearby.' },
  { id: 'promenade-canopy', name: 'Promenade Canopy', location: 'Puducherry, India', state: 'Puducherry', trees: 1600, volunteers: 45, species: 17, established: '2023', img: 2, story: 'A coastal avenue replanted after a cyclone stripped it bare, one street tree at a time.' },
  { id: 'shivalik-foothill-line', name: 'Shivalik Foothill Line', location: 'Ropar, India', state: 'Punjab', trees: 4700, volunteers: 82, species: 18, established: '2020', img: 3, story: 'A foothill planting slowing the runoff that used to carry Punjab\'s topsoil straight into the rivers.' },
  { id: 'teesta-riverbank-nursery', name: 'Teesta Riverbank Nursery', location: 'Gangtok, India', state: 'Sikkim', trees: 2900, volunteers: 55, species: 40, established: '2022', img: 4, story: 'A riverbank nursery rebuilding what the Teesta\'s floods keep washing away, one monsoon at a time.' },
  { id: 'kodaikanal-shola-line', name: 'Kodaikanal Shola Line', location: 'Kodaikanal, India', state: 'Tamil Nadu', trees: 4100, volunteers: 90, species: 62, established: '2019', img: 5, story: 'A shola-forest replanting above Kodaikanal, pushing back against a century of eucalyptus.' },
  { id: 'sukhna-lake-catchment', name: 'Sukhna Lake Catchment', location: 'Chandigarh, India', state: 'Chandigarh', trees: 2400, volunteers: 52, species: 20, established: '2021', img: 6, story: 'A catchment planting above Sukhna Lake, slowing the silt one monsoon promised to stop.' },
  { id: 'kbr-park-extension', name: 'KBR Park Extension', location: 'Hyderabad, India', state: 'Telangana', trees: 3300, volunteers: 78, species: 31, established: '2022', img: 7, story: 'An extension planting beside the city\'s last big urban forest, grown to give it somewhere to spread.' },
  { id: 'unakoti-hill-canopy', name: 'Unakoti Hill Canopy', location: 'Unakoti, India', state: 'Tripura', trees: 2700, volunteers: 48, species: 23, established: '2021', img: 8, story: 'A hillside replanting around the ancient rock carvings, grown to shade the stone from another dry season.' },
  { id: 'chambal-ravine-line', name: 'Chambal Ravine Line', location: 'Etawah, India', state: 'Uttar Pradesh', trees: 6200, volunteers: 115, species: 25, established: '2020', img: 9, story: 'A ravine-edge planting stabilising slopes long left to erosion along the Chambal.' },
  { id: 'simlipal-fringe-forest', name: 'Simlipal Fringe Forest', location: 'Baripada, India', state: 'Odisha', trees: 5800, volunteers: 108, species: 43, established: '2019', img: 10, story: 'A fringe forest around Simlipal\'s buffer, planted with the villages that share its boundary.' },
  { id: 'vasona-lake-grove', name: 'Vasona Lake Grove', location: 'Silvassa, India', state: 'Dadara & Nagar Havelli', trees: 1500, volunteers: 30, species: 14, established: '2022', img: 11, story: 'A lakeside grove around Vasona, planted by families who picnic there every winter.' },
  { id: 'nani-daman-seafront', name: 'Nani Daman Seafront', location: 'Daman, India', state: 'Daman & Diu', trees: 1200, volunteers: 26, species: 11, established: '2023', img: 12, story: 'A seafront planting along Nani Daman, breaking the salt wind before it reaches the town.' },
  { id: 'mhadei-buffer-canopy', name: 'Mhadei Buffer Canopy', location: 'Valpoi, India', state: 'Goa', trees: 3600, volunteers: 72, species: 39, established: '2020', img: 13, story: 'A buffer canopy along the Mhadei wildlife sanctuary, replanted after years of illegal logging.' },
  { id: 'gir-fringe-line', name: 'Gir Fringe Line', location: 'Sasan Gir, India', state: 'Gujarat', trees: 4400, volunteers: 85, species: 19, established: '2021', img: 14, story: 'A fringe planting around Gir, giving the last wild Asiatic lions a little more forest to disappear into.' },
  { id: 'sultanpur-wetland-edge', name: 'Sultanpur Wetland Edge', location: 'Gurugram, India', state: 'Haryana', trees: 2200, volunteers: 50, species: 24, established: '2022', img: 15, story: 'A wetland-edge planting drawing migratory birds back to a lake the city had almost forgotten.' },
  { id: 'great-himalayan-buffer', name: 'Great Himalayan Buffer', location: 'Sainj Valley, India', state: 'Himachal Pradesh', trees: 3800, volunteers: 68, species: 45, established: '2021', img: 0, story: 'A buffer-zone planting on the edge of the Great Himalayan National Park, grown one steep terrace at a time.' },
  { id: 'pahalgam-pine-line', name: 'Pahalgam Pine Line', location: 'Pahalgam, India', state: 'Jammu & Kashmir', trees: 3100, volunteers: 58, species: 20, established: '2020', img: 1, story: 'A pine replanting above Pahalgam, replacing what decades of tourism and timber quietly took.' },
  { id: 'betla-buffer-belt', name: 'Betla Buffer Belt', location: 'Latehar, India', state: 'Jharkhand', trees: 4600, volunteers: 90, species: 32, established: '2019', img: 2, story: 'A buffer belt around Betla National Park, planted with the villages once resettled from inside it.' },
  { id: 'bandipur-corridor-line', name: 'Bandipur Corridor Line', location: 'Gundlupet, India', state: 'Karnataka', trees: 5900, volunteers: 130, species: 58, established: '2018', img: 3, story: 'A corridor planting linking Bandipur to the forests beyond it, so the elephants don\'t have to cross the highway.' },
  { id: 'kavaratti-lagoon-shade', name: 'Kavaratti Lagoon Shade', location: 'Kavaratti, India', state: 'Lakshadweep', trees: 900, volunteers: 20, species: 7, established: '2023', img: 4, story: 'A lagoon-side planting of native atoll trees, small enough to count by hand and grown anyway.' },
  { id: 'shirui-hill-nursery', name: 'Shirui Hill Nursery', location: 'Ukhrul, India', state: 'Manipur', trees: 2600, volunteers: 44, species: 34, established: '2021', img: 5, story: 'A hillside nursery raising native trees alongside the rare Shirui lily\'s only home on earth.' },
  { id: 'phawngpui-approach-grove', name: 'Phawngpui Approach Grove', location: 'Lawngtlai, India', state: 'Mizoram', trees: 3300, volunteers: 60, species: 37, established: '2020', img: 6, story: 'An approach-trail grove below the Blue Mountain, planted by the villages that guard it.' },
  { id: 'khonoma-terrace-forest', name: 'Khonoma Terrace Forest', location: 'Khonoma, India', state: 'Nagaland', trees: 2800, volunteers: 50, species: 30, established: '2019', img: 7, story: 'A terrace-edge forest around India\'s first green village, grown to prove the model travels.' },
  { id: 'aravalli-biodiversity-park', name: 'Aravalli Biodiversity Park', location: 'New Delhi, India', state: 'NCT of Delhi', trees: 4800, volunteers: 140, species: 33, established: '2020', img: 8, story: 'A reclaimed mining pit turned biodiversity park, replanted with everything that used to grow there.' },

  // Maharashtra: seven smaller drives across the state, kept distinct on purpose
  // — this is the one state where "Show all" on the map actually has something to show.
  { id: 'sahyadri-rain-grove', name: 'Sahyadri Rain Grove', location: 'Pune, India', state: 'Maharashtra', trees: 8800, volunteers: 190, species: 45, established: '2019', img: 5, story: 'A monsoon-fed grove on the Sahyadri slopes above Pune, planted faster than the erosion could undo it.' },
  { id: 'godavari-headwater-line', name: 'Godavari Headwater Line', location: 'Nashik, India', state: 'Maharashtra', trees: 6100, volunteers: 130, species: 30, established: '2020', img: 0, story: 'A planting at the Godavari\'s source, so the river has somewhere green to start from.' },
  { id: 'vidarbha-shade-belt', name: 'Vidarbha Shade Belt', location: 'Nagpur, India', state: 'Maharashtra', trees: 9400, volunteers: 205, species: 24, established: '2018', img: 1, story: 'A farm-boundary shade belt across drought-prone Vidarbha, planted with the farmers, not for them.' },
  { id: 'marathwada-dry-forest', name: 'Marathwada Dry Forest', location: 'Aurangabad, India', state: 'Maharashtra', trees: 5300, volunteers: 110, species: 19, established: '2021', img: 2, story: 'A dryland restoration in one of Maharashtra\'s thirstiest districts, chosen for its rainfall, not despite it.' },
  { id: 'panhala-hill-canopy', name: 'Panhala Hill Canopy', location: 'Kolhapur, India', state: 'Maharashtra', trees: 4600, volunteers: 88, species: 27, established: '2022', img: 3, story: 'A hillfort slope replanted around Panhala, roots now doing what the old ramparts once did.' },
  { id: 'thane-creek-mangroves', name: 'Thane Creek Mangroves', location: 'Thane, India', state: 'Maharashtra', trees: 7200, volunteers: 160, species: 16, established: '2020', img: 4, story: 'A mangrove replanting along Thane creek, squeezed between the highway and the tide, and holding on.' },
  { id: 'sindhudurg-coastal-grove', name: 'Sindhudurg Coastal Grove', location: 'Sindhudurg, India', state: 'Maharashtra', trees: 3800, volunteers: 76, species: 38, established: '2019', img: 5, story: 'A native coastal grove behind Sindhudurg\'s beaches, planted where the casuarina monoculture used to be.' },
]

const LEGACY_TREES = [
  { id: 'grandfather-banyan', name: 'The Grandfather Banyan', species: 'Ficus benghalensis', owner: 'Ananya R.', years: 41, location: 'Karnataka, India', img: 0, quote: 'My father planted this tree the year I was born. It has outgrown all of us – kindly, patiently.' },
  { id: 'the-first-sapling', name: 'The First Sapling', species: 'Quercus leucotrichophora', owner: 'Ibrahim K.', years: 12, location: 'Uttarakhand, India', img: 1, quote: 'A promise to my daughter. On her tenth birthday she watered it herself.' },
  { id: 'monsoon-mother', name: 'Monsoon Mother', species: 'Mangifera indica', owner: 'Sundari P.', years: 27, location: 'Kerala, India', img: 2, quote: 'The mangoes she gives are shared across three villages. Some years we lose count.' },
  { id: 'the-quiet-one', name: 'The Quiet One', species: 'Terminalia arjuna', owner: 'Rohan S.', years: 19, location: 'Madhya Pradesh, India', img: 3, quote: 'It never asked for anything. It only kept giving shade.' },
]

const COMPETITIONS = [
  { id: 'best-looking-tree', title: 'Best Looking Tree', tagline: 'The most beautiful tree, chosen by the world.', deadline: '2025-08-14', entriesCount: 12480, img: 1 },
  { id: 'best-legacy-quote', title: 'Best Legacy Quote', tagline: 'One sentence that outlives us.', deadline: '2025-07-30', entriesCount: 8721, img: 2 },
  { id: 'greenest-school', title: 'Greenest School', tagline: 'Where the next generation grows a forest.', deadline: '2025-09-05', entriesCount: 342, img: 3 },
  { id: 'greenest-company', title: 'Greenest Company', tagline: 'Beyond CSR – measurable impact.', deadline: '2025-09-20', entriesCount: 268, img: 4 },
  { id: 'greenest-city', title: 'Greenest City', tagline: 'Cities that breathe again.', deadline: '2025-10-01', entriesCount: 96, img: 5 },
  { id: 'most-active-ngo', title: 'Most Active NGO', tagline: 'The tireless hands behind the movement.', deadline: '2025-08-28', entriesCount: 214, img: 0 },
  { id: 'most-active-community', title: 'Most Active Community', tagline: 'Neighbourhoods that plant together.', deadline: '2025-08-25', entriesCount: 1128, img: 1 },
  { id: 'best-nature-photograph', title: 'Best Nature Photograph', tagline: 'A single frame. A whole story.', deadline: '2025-07-18', entriesCount: 24810, img: 2 },
  { id: 'best-biodiversity-spot', title: 'Best Biodiversity Spot', tagline: 'Where life crowds joyfully together.', deadline: '2025-09-12', entriesCount: 812, img: 3 },
  { id: 'most-inspiring-story', title: 'Most Inspiring Story', tagline: 'The story that plants a seed in someone else.', deadline: '2025-10-10', entriesCount: 4210, img: 4 },
]

const LEADERBOARDS = {
  Individuals: [
    { name: 'Ananya Rao', place: 'Bengaluru', score: 4820 },
    { name: 'Ibrahim Khan', place: 'Dehradun', score: 4610 },
    { name: 'Sundari Pillai', place: 'Kochi', score: 4402 },
    { name: 'Rohan Sharma', place: 'Bhopal', score: 4188 },
    { name: 'Meera Iyer', place: 'Chennai', score: 3990 },
    { name: 'Tenzin Dolma', place: 'Gangtok', score: 3812 },
    { name: 'Farah Ali', place: 'Hyderabad', score: 3701 },
    { name: 'Vikram Bhat', place: 'Pune', score: 3555 },
  ],
  Communities: [
    { name: 'Yellapur Greens', place: 'Karnataka', score: 24810 },
    { name: 'Nilgiri Neighbours', place: 'Tamil Nadu', score: 22470 },
    { name: 'River Circle', place: 'Assam', score: 21320 },
    { name: 'Kutch Sowers', place: 'Gujarat', score: 19860 },
    { name: 'Konkan Roots', place: 'Maharashtra', score: 18420 },
    { name: 'Braj Bagh', place: 'Uttar Pradesh', score: 17110 },
  ],
  NGOs: [
    { name: 'Groves & Grains Trust', place: 'India', score: 128400 },
    { name: 'Wildroot Foundation', place: 'India', score: 121600 },
    { name: 'Blue Ridge Restoration', place: 'India', score: 118220 },
    { name: 'One Tree Circle', place: 'India', score: 109740 },
    { name: 'Deccan Dryland Trust', place: 'India', score: 98220 },
  ],
  Cities: [
    { name: 'Bengaluru', place: 'Karnataka', score: 78210 },
    { name: 'Kochi', place: 'Kerala', score: 71820 },
    { name: 'Dehradun', place: 'Uttarakhand', score: 68410 },
    { name: 'Guwahati', place: 'Assam', score: 61250 },
    { name: 'Pune', place: 'Maharashtra', score: 59870 },
  ],
  Schools: [
    { name: 'Rishi Valley School', place: 'Andhra Pradesh', score: 12480 },
    { name: 'Green Meadows Public', place: 'Bengaluru', score: 11720 },
    { name: 'Vidya Vann Vidyalaya', place: 'Bhopal', score: 10990 },
    { name: 'Sahyadri Vidyalaya', place: 'Pune', score: 9420 },
  ],
  Companies: [
    { name: 'Terra Textiles', place: 'India', score: 48720 },
    { name: 'Northwind Coffee Co.', place: 'India', score: 42160 },
    { name: 'Kavya Craft Studios', place: 'India', score: 39810 },
    { name: 'Meridian Semiconductors', place: 'India', score: 37220 },
  ],
  Forests: [
    { name: 'Whispering Ghats', place: 'Kerala', score: 68240 },
    { name: 'Mangrove Mile', place: 'Sundarbans', score: 51200 },
    { name: 'Monsoon Canopy', place: 'Meghalaya', score: 47510 },
    { name: 'Aravali Grove', place: 'Rajasthan', score: 42180 },
  ],
}

const BLOGS = [
  { id: 'why-native-species-matter', title: 'Why Native Species Matter More Than Ever', category: 'Wildlife', author: 'Meera Iyer', date: 'June 14, 2025', minutes: 7, img: 0, excerpt: 'A forest of the right trees, not just any trees. A field guide to planting with the land.' },
  { id: 'the-quiet-return-of-the-hornbill', title: 'The Quiet Return of the Hornbill', category: 'Wildlife', author: 'Tenzin Dolma', date: 'June 08, 2025', minutes: 5, img: 1, excerpt: 'How thirty families in Nagaland brought back a bird – and a whole forest with it.' },
  { id: 'a-monsoon-planting-guide', title: 'A Monsoon Planting Guide', category: 'Plantation Guides', author: 'Ibrahim Khan', date: 'May 30, 2025', minutes: 9, img: 2, excerpt: 'Nine species. Nine soils. Nine gentle instructions before the first rain.' },
  { id: 'reading-the-arjuna-tree', title: 'Reading the Arjuna Tree', category: 'Native Species', author: 'Sundari Pillai', date: 'May 22, 2025', minutes: 6, img: 3, excerpt: 'A river bank companion, a medicine, a shade, a story.' },
  { id: 'city-birds-are-listening', title: 'City Birds Are Listening', category: 'Environmental News', author: 'Farah Ali', date: 'May 12, 2025', minutes: 4, img: 0, excerpt: 'Urban plantings are changing the songs of common birds. Here is what we found.' },
  { id: 'the-slow-forest', title: 'The Slow Forest', category: 'Editorial', author: 'Ananya Rao', date: 'April 30, 2025', minutes: 8, img: 1, excerpt: 'On the ethic of planting something you will not live to see fully grown.' },
]

const PARTNERS = [
  { group: 'CSR', names: ['Terra Textiles', 'Northwind Coffee Co.', 'Kavya Craft Studios', 'Meridian Semiconductors', 'Aster Financial', 'Halcyon Hotels'] },
  { group: 'NGOs', names: ['Groves & Grains Trust', 'Wildroot Foundation', 'Blue Ridge Restoration', 'One Tree Circle', 'Deccan Dryland Trust', 'River Circle'] },
  { group: 'Nurseries', names: ['Sapling Studio', 'Rootworks', 'The Native Nursery', 'Green Verse', 'Aranya Bagh', 'Prithvi Pots'] },
  { group: 'Schools', names: ['Rishi Valley School', 'Green Meadows Public', 'Vidya Vann Vidyalaya', 'Sahyadri Vidyalaya', 'Modern Sanctum Academy'] },
  { group: 'Universities', names: ['Coastal Institute of Ecology', 'Himalaya University', 'Central Forest Sciences', 'Deccan Institute of Design'] },
]

const ECOSYSTEM = [
  { id: 'individuals', title: 'Individuals', description: 'Plant a tree in your name. Watch it grow across the years.', long: 'Every individual on ARTH begins with a single sapling. You choose a native species, a nursery near you, and a spot that means something. From that moment we help you track its growth, share its story, and connect it into the wider forest of the movement.' },
  { id: 'communities', title: 'Communities', description: 'Neighbourhoods, villages and citizen groups that plant together.', long: 'Community groves become landmarks. ARTH gives your community a shared page, a live tree count, a plantation calendar, and a story wall – so children who plant today can return in fifteen years to walk beneath what they made.' },
  { id: 'ngos', title: 'NGOs', description: 'Field organisations doing the tireless work of restoration.', long: 'Verified NGOs run large plantation drives on ARTH. We offer volunteer coordination, species inventory, geo-tagged planting logs, and transparent public dashboards that partners and donors can trust.' },
  { id: 'nurseries', title: 'Nurseries', description: 'The quiet heroes who grow the saplings the world will plant.', long: 'Nurseries list native saplings by region and season. Individuals, communities and NGOs source directly from them, keeping the movement rooted in local biodiversity – never imported monocultures.' },
  { id: 'organisations', title: 'Organisations', description: 'CSR & corporate partners planting forests, not press releases.', long: 'CSR partners adopt forests, sponsor community drives, and receive measurable, verifiable impact reports. No greenwashing – every tree is geo-tagged, species-tagged and public.' },
]

const MAP_POINTS = [
  { x: 22, y: 32, label: 'Aravali Grove' },
  { x: 30, y: 62, label: 'Whispering Ghats' },
  { x: 33, y: 22, label: 'Himalayan Cradle' },
  { x: 46, y: 54, label: 'Mangrove Mile' },
  { x: 40, y: 44, label: 'Red Earth Woods' },
  { x: 52, y: 30, label: 'Monsoon Canopy' },
  { x: 68, y: 40, label: 'Kinabalu Fringe' },
  { x: 78, y: 60, label: 'Reef Roots' },
  { x: 12, y: 46, label: 'Sahel Line' },
  { x: 82, y: 24, label: 'Boreal Belt' },
  { x: 26, y: 74, label: 'Cape Corridor' },
  { x: 60, y: 70, label: 'Coral Coast' },
]

const TIMELINE = [
  { year: '2016', title: 'A single sapling', text: 'Two friends plant one banyan on a dry Aravali hill. They agree to come back every year.' },
  { year: '2018', title: 'A hundred hands', text: 'Neighbours join. The hill wears its first green shawl.' },
  { year: '2020', title: 'A movement finds its name', text: 'ARTH – the earth, patient and giving – becomes a network of nurseries and NGOs.' },
  { year: '2022', title: 'A million trees', text: 'From Sundarbans to the Himalayas, a million saplings enter the ground.' },
  { year: '2025', title: 'A living archive', text: 'Every tree, every story, every hand – kept in a public, open, forever record.' },
]

async function main() {
  // NOTE: prisma.competition.deleteMany() below cascades onto real CompetitionEntry/
  // CompetitionEntryVote rows submitted by real users (see packages/db/prisma/schema.prisma) —
  // this wipe-and-reseed script is meant for fresh/dev databases, not a populated one.
  await prisma.stat.deleteMany()
  await prisma.timelineEntry.deleteMany()
  await prisma.mapPoint.deleteMany()
  await prisma.leaderboardEntry.deleteMany()
  await prisma.partner.deleteMany()
  await prisma.ecosystemEntry.deleteMany()
  await prisma.blog.deleteMany()
  await prisma.competition.deleteMany()
  await prisma.legacyTree.deleteMany()
  await prisma.forest.deleteMany()

  await prisma.forest.createMany({
    data: FORESTS.map(({ img, ...f }) => ({ ...f, imageUrl: IMAGES.forests[img] })),
  })

  await prisma.legacyTree.createMany({
    data: LEGACY_TREES.map(({ img, ...t }) => ({ ...t, imageUrl: IMAGES.legacy[img] })),
  })

  await prisma.competition.createMany({
    data: COMPETITIONS.map(({ img, deadline, ...c }) => ({
      ...c,
      deadline: new Date(deadline),
      imageUrl: IMAGES.forests[img],
    })),
  })

  await prisma.blog.createMany({
    data: BLOGS.map(({ img, ...b }) => ({ ...b, imageUrl: IMAGES.blogs[img] })),
  })

  await prisma.partner.createMany({
    data: PARTNERS.flatMap((p) => p.names.map((name) => ({ group: p.group, name }))),
  })

  await prisma.ecosystemEntry.createMany({ data: ECOSYSTEM })

  await prisma.leaderboardEntry.createMany({
    data: Object.entries(LEADERBOARDS).flatMap(([category, entries]) =>
      entries.map((e) => ({ category, ...e }))
    ),
  })

  await prisma.stat.createMany({ data: STATS })
  await prisma.timelineEntry.createMany({ data: TIMELINE })
  await prisma.mapPoint.createMany({ data: MAP_POINTS })

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
