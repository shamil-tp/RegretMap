// RegretMap editorial travel notes — additional destinations worldwide.
// Editorial content (stories.source = 'editorial'), not personal experiences.
// Coordinates are approximate public locations.

/** @type {import("./types.mjs").Country[]} */
const countries = [
  {
    country: "Germany",
    destinations: [
      {
        slug: "berlin",
        name: "Berlin",
        region: "Berlin",
        at: [52.52, 13.405],
        about: "Germany's capital, known for its history, museums and neighbourhood life.",
        notes: [
          {
            key: "reichstag-dome",
            cat: "planning",
            title: "The Reichstag dome needs advance registration",
            place: "Reichstag building",
            at: [52.5186, 13.3762],
            body: "Visiting the glass dome on top of the Reichstag is free, but you have to register online in advance and bring ID. Walk-up visits are rarely possible.",
            lesson: "Register a few days ahead and carry the ID you registered with.",
          },
          {
            key: "sunday-shops",
            cat: "planning",
            title: "Most shops close on Sundays",
            place: "Berlin",
            at: [52.52, 13.405],
            body: "Supermarkets and most shops in Germany close on Sundays and public holidays. Some stations and late-night kiosks stay open, with a limited range.",
            lesson: "Do your shopping by Saturday evening.",
            advice: "Some smaller cafés and bars still prefer cash, so carry a little.",
          },
        ],
      },
    ],
  },
  {
    country: "Austria",
    destinations: [
      {
        slug: "vienna",
        name: "Vienna",
        region: "Vienna",
        at: [48.2082, 16.3738],
        about: "Austria's capital of palaces, coffee houses and classical music.",
        notes: [
          {
            key: "schonbrunn-tickets",
            cat: "planning",
            title: "Schönbrunn palace tours run on timed tickets",
            place: "Schönbrunn Palace",
            at: [48.1845, 16.3122],
            body: "Palace tours at Schönbrunn are sold for set entry times, and the next free slot can be hours away in busy months. The gardens are open separately.",
            lesson: "Book the palace tour online and explore the gardens around your slot.",
          },
        ],
      },
    ],
  },
  {
    country: "Hungary",
    destinations: [
      {
        slug: "budapest",
        name: "Budapest",
        region: "Budapest",
        at: [47.4979, 19.0402],
        about: "A Danube capital known for thermal baths and grand riverside architecture.",
        notes: [
          {
            key: "forint",
            cat: "costs",
            title: "Hungary uses the forint",
            place: "Budapest",
            at: [47.4979, 19.0402],
            body: "Hungary's currency is the forint. Some tourist places accept euros, but usually at a poor rate, with change given in forints.",
            lesson: "Pay by card or in forints rather than euros.",
          },
          {
            key: "baths-kit",
            cat: "packing",
            title: "Pack for the thermal baths",
            place: "Széchenyi Baths",
            at: [47.5186, 19.0823],
            body: "Thermal baths have their own rules, and some swimming pools ask for a swimming cap. Flip-flops and a towel are useful, and renting them adds up.",
            lesson: "Bring flip-flops, a towel and a cap if you plan to swim laps.",
          },
        ],
      },
    ],
  },
  {
    country: "Greece",
    destinations: [
      {
        slug: "athens",
        name: "Athens",
        region: "Attica",
        at: [37.9838, 23.7275],
        about: "Greece's capital, crowned by the Acropolis.",
        notes: [
          {
            key: "acropolis-heat",
            cat: "weather",
            title: "The Acropolis can close in extreme heat",
            place: "Acropolis",
            at: [37.9715, 23.7257],
            body: "The Acropolis is an exposed hilltop of white marble. During heatwaves, authorities have closed it in the middle of the day, and entry uses timed slots.",
            lesson: "Book an early slot and check for heat closures on hot days.",
          },
        ],
      },
    ],
  },
  {
    country: "Italy",
    destinations: [
      {
        slug: "florence",
        name: "Florence",
        region: "Tuscany",
        at: [43.7696, 11.2558],
        about: "The Renaissance city of the Uffizi, the Duomo and the Ponte Vecchio.",
        notes: [
          {
            key: "ztl",
            cat: "transport",
            title: "Don't drive into the restricted traffic zone",
            place: "Historic centre (ZTL)",
            at: [43.7731, 11.2558],
            body: "Florence's historic centre is a limited traffic zone watched by cameras. Driving in without a permit can mean a fine arriving months later through your rental company.",
            lesson: "Park outside the zone and walk or take the tram in.",
          },
          {
            key: "museum-booking",
            cat: "planning",
            title: "Book the Uffizi and Accademia ahead",
            place: "Uffizi Gallery",
            at: [43.7678, 11.2553],
            body: "Queues for the Uffizi and the Accademia, home of Michelangelo's David, can be long without a booking.",
            lesson: "Reserve timed entry for both before you arrive.",
          },
        ],
      },
      {
        slug: "positano",
        name: "Positano (Amalfi Coast)",
        region: "Campania",
        at: [40.6281, 14.485],
        about: "A cliffside village on the Amalfi Coast, built down to the sea in steps.",
        notes: [
          {
            key: "coast-road",
            cat: "transport",
            title: "The coast road is slow and the buses fill up",
            place: "Amalfi Drive (SS163)",
            at: [40.635, 14.5],
            body: "The coast road is narrow and winding, with heavy summer traffic. Public buses fill up quickly, and drivers struggle to find parking.",
            lesson: "Use ferries between towns when the sea allows, and allow extra time on the road.",
          },
          {
            key: "steps",
            cat: "accessibility",
            title: "Positano is mostly stairs",
            place: "Positano",
            at: [40.6281, 14.485],
            body: "Getting around Positano means steep lanes and long staircases between the road and the beach.",
            lesson: "Pack light and ask your stay how many steps lie between it and the road.",
          },
        ],
      },
    ],
  },
  {
    country: "Japan",
    destinations: [
      {
        slug: "nara",
        name: "Nara",
        region: "Nara Prefecture",
        at: [34.6851, 135.8048],
        about: "Japan's first permanent capital, known for its temples and free-roaming deer.",
        notes: [
          {
            key: "deer",
            cat: "safety",
            title: "Nara's deer can get pushy",
            place: "Nara Park",
            at: [34.6851, 135.843],
            body: "The deer in Nara Park are wild animals used to being fed special crackers. They can nip, butt or chase visitors who hold out food and then pull it away.",
            lesson: "Hand crackers over quickly, show empty hands when done, and keep children close.",
          },
        ],
      },
    ],
  },
  {
    country: "Thailand",
    destinations: [
      {
        slug: "phuket",
        name: "Phuket",
        region: "Phuket Province",
        at: [7.8804, 98.3923],
        about: "Thailand's largest island, on the Andaman Sea.",
        notes: [
          {
            key: "monsoon-seas",
            cat: "safety",
            title: "West-coast seas are rough in the monsoon",
            place: "Patong Beach",
            at: [7.8961, 98.2966],
            body: "During the south-west monsoon, beaches on Phuket's west coast get strong waves and rip currents, and red flags go up. Island boat trips can be cancelled.",
            lesson: "Never swim where red flags are up, and keep boat trip days flexible.",
          },
        ],
      },
    ],
  },
  {
    country: "Malaysia",
    destinations: [
      {
        slug: "kuala-lumpur",
        name: "Kuala Lumpur",
        region: "Federal Territory of Kuala Lumpur",
        at: [3.139, 101.6869],
        about: "Malaysia's capital, home to the Petronas Towers and the Batu Caves nearby.",
        notes: [
          {
            key: "batu-caves",
            cat: "local_customs",
            title: "Batu Caves has a dress code and a long staircase",
            place: "Batu Caves",
            at: [3.2379, 101.684],
            body: "The Batu Caves temple is reached by 272 steep steps, with monkeys along the way. Visitors with uncovered legs are asked to wear a sarong, which can be rented at the bottom.",
            lesson: "Wear clothes that cover your knees, keep food away, and take the steps slowly.",
          },
        ],
      },
    ],
  },
  {
    country: "Laos",
    destinations: [
      {
        slug: "luang-prabang",
        name: "Luang Prabang",
        region: "Luang Prabang Province",
        at: [19.8856, 102.1347],
        about: "A UNESCO-listed town of temples on the Mekong.",
        notes: [
          {
            key: "alms-giving",
            cat: "local_customs",
            title: "The morning alms round is a religious ritual",
            place: "Sakkaline Road",
            at: [19.8915, 102.1385],
            body: "Monks walk through town at dawn to collect alms. It has become popular with visitors, and flash photography or blocking the procession is disrespectful.",
            lesson: "Watch quietly from across the street, without flash, and only take part if you do it respectfully.",
          },
        ],
      },
    ],
  },
  {
    country: "Philippines",
    destinations: [
      {
        slug: "el-nido",
        name: "El Nido",
        region: "Palawan",
        at: [11.1956, 119.4075],
        about: "A Palawan town known for limestone islands and lagoon boat tours.",
        notes: [
          {
            key: "cash",
            cat: "costs",
            title: "Bring enough cash to El Nido",
            place: "El Nido town",
            at: [11.1956, 119.4075],
            body: "El Nido has a small number of ATMs, which can run out or go offline. Island-hopping tours and environmental fees are often paid in cash.",
            lesson: "Arrive with enough cash for your stay.",
          },
          {
            key: "tour-weather",
            cat: "weather",
            title: "Island tours depend on the sea",
            place: "Bacuit Bay",
            at: [11.15, 119.37],
            body: "Boat tours to the lagoons and islands are cancelled when the sea is rough, which is more common in the wet season.",
            lesson: "Don't leave island hopping for your last day.",
          },
        ],
      },
    ],
  },
  {
    country: "Hong Kong",
    destinations: [
      {
        slug: "hong-kong",
        name: "Hong Kong",
        region: "Hong Kong",
        at: [22.3193, 114.1694],
        about: "A harbour city of skyscrapers, ferries and hiking trails.",
        notes: [
          {
            key: "typhoon-signals",
            cat: "weather",
            title: "Typhoon signals change everything",
            place: "Victoria Harbour",
            at: [22.2855, 114.1577],
            body: "When higher typhoon warning signals are raised, ferries, many shops and attractions close, and flights can be disrupted. Typhoons are most common in summer and early autumn.",
            lesson: "Watch the Hong Kong Observatory's warnings and keep plans flexible in typhoon season.",
          },
          {
            key: "octopus",
            cat: "transport",
            title: "Use a contactless card or Octopus for transport",
            place: "MTR",
            at: [22.2849, 114.1582],
            body: "The MTR, buses, trams and Star Ferry all accept the Octopus card, and many also take contactless bank cards. Buying single tickets each time is slower.",
            lesson: "Sort out tap-to-pay on your first day.",
          },
        ],
      },
    ],
  },
  {
    country: "United States",
    destinations: [
      {
        slug: "honolulu",
        name: "Honolulu",
        region: "Hawaii",
        at: [21.3069, -157.8583],
        about: "Hawaii's capital on Oʻahu, home to Waikīkī and Diamond Head.",
        notes: [
          {
            key: "diamond-head",
            cat: "planning",
            title: "Diamond Head needs a reservation",
            place: "Diamond Head State Monument",
            at: [21.2614, -157.8059],
            body: "Out-of-state visitors need to reserve an entry time for the Diamond Head summit hike in advance.",
            lesson: "Book a morning slot online before you go.",
          },
          {
            key: "reef-safe",
            cat: "packing",
            title: "Check your sunscreen's ingredients",
            place: "Waikīkī Beach",
            at: [21.2793, -157.8292],
            body: "Hawaii bans the sale of sunscreens containing certain chemicals that harm coral reefs.",
            lesson: "Bring or buy a reef-safe sunscreen.",
          },
        ],
      },
    ],
  },
  {
    country: "Mexico",
    destinations: [
      {
        slug: "tulum",
        name: "Tulum",
        region: "Quintana Roo",
        at: [20.2114, -87.4654],
        about: "A Caribbean coast town with Maya ruins above the sea.",
        notes: [
          {
            key: "ruins-early",
            cat: "planning",
            title: "See the ruins at opening time",
            place: "Tulum archaeological site",
            at: [20.2147, -87.429],
            body: "The Tulum ruins are compact, sunny and very popular. By late morning they're hot and busy with tour groups.",
            lesson: "Arrive when the site opens, with water and sun protection.",
          },
          {
            key: "sargassum",
            cat: "weather",
            title: "Seaweed can cover the beaches",
            place: "Tulum beach",
            at: [20.1953, -87.4436],
            body: "Large amounts of sargassum seaweed wash up on Mexican Caribbean beaches in some seasons, mostly in the warmer months. How much arrives varies year to year.",
            lesson: "Check recent sargassum reports before booking a beach-only trip.",
          },
        ],
      },
    ],
  },
  {
    country: "Colombia",
    destinations: [
      {
        slug: "cartagena",
        name: "Cartagena",
        region: "Bolívar",
        at: [10.391, -75.4794],
        about: "A Caribbean port city with a colourful walled old town.",
        notes: [
          {
            key: "heat",
            cat: "weather",
            title: "Midday in the walled city is intense",
            place: "Walled City",
            at: [10.4236, -75.5508],
            body: "Cartagena is hot and humid year-round. Midday walks through the old town can be exhausting.",
            lesson: "Explore in the morning and evening, and rest during the afternoon heat.",
          },
          {
            key: "agree-prices",
            cat: "costs",
            title: "Agree prices with beach vendors first",
            place: "Bocagrande beach",
            at: [10.3997, -75.5539],
            body: "Massages, drinks and snacks offered on the beach rarely have fixed prices, and disagreements usually start when nothing was agreed.",
            lesson: "Ask the price before accepting anything.",
          },
        ],
      },
    ],
  },
  {
    country: "Argentina",
    destinations: [
      {
        slug: "buenos-aires",
        name: "Buenos Aires",
        region: "Buenos Aires",
        at: [-34.6037, -58.3816],
        about: "Argentina's capital, known for its neighbourhoods, steakhouses and tango.",
        notes: [
          {
            key: "late-dinner",
            cat: "local_customs",
            title: "Dinner starts late",
            place: "Palermo",
            at: [-34.5875, -58.4302],
            body: "Many restaurants in Buenos Aires fill up late in the evening, and some don't open for dinner until the evening is well under way.",
            lesson: "Have a late afternoon snack and plan dinner later than you might at home.",
          },
          {
            key: "payments",
            cat: "costs",
            title: "Check the current way to pay",
            place: "Buenos Aires",
            at: [-34.6037, -58.3816],
            body: "Argentina's exchange rules and the best way for visitors to pay (card or cash) have changed often in recent years.",
            lesson: "Look up current guidance shortly before you travel.",
          },
        ],
      },
    ],
  },
  {
    country: "Canada",
    destinations: [
      {
        slug: "vancouver",
        name: "Vancouver",
        region: "British Columbia",
        at: [49.2827, -123.1207],
        about: "A coastal city between mountains and sea, and a gateway to Vancouver Island.",
        notes: [
          {
            key: "ferries",
            cat: "transport",
            title: "Reserve ferries on summer weekends",
            place: "Tsawwassen ferry terminal",
            at: [49.007, -123.1286],
            body: "Car spaces on the ferries to Vancouver Island fill up on summer weekends and holidays. Without a reservation you can wait for several sailings.",
            lesson: "Reserve a sailing for busy dates.",
          },
          {
            key: "rain",
            cat: "packing",
            title: "Pack for rain outside summer",
            place: "Stanley Park",
            at: [49.3017, -123.1417],
            body: "Vancouver gets a lot of rain from autumn to spring, often as steady drizzle for days.",
            lesson: "Bring a waterproof jacket and shoes that handle wet streets.",
          },
        ],
      },
    ],
  },
  {
    country: "Australia",
    destinations: [
      {
        slug: "melbourne",
        name: "Melbourne",
        region: "Victoria",
        at: [-37.8136, 144.9631],
        about: "A city of laneways, cafés and trams on Port Phillip Bay.",
        notes: [
          {
            key: "four-seasons",
            cat: "weather",
            title: "Four seasons in one day",
            place: "Melbourne",
            at: [-37.8136, 144.9631],
            body: "Melbourne's weather can swing between hot, cold, windy and wet within a single day.",
            lesson: "Carry a light jacket even on a sunny morning.",
          },
          {
            key: "free-tram-zone",
            cat: "transport",
            title: "Trams in the city centre are free",
            place: "Free Tram Zone",
            at: [-37.8162, 144.9641],
            body: "Trams within Melbourne's central Free Tram Zone don't need a ticket, but trips beyond it require a myki card.",
            lesson: "Check whether your stop is inside the zone before you ride without paying.",
          },
        ],
      },
    ],
  },
  {
    country: "Kenya",
    destinations: [
      {
        slug: "maasai-mara",
        name: "Maasai Mara",
        region: "Narok County",
        at: [-1.4061, 35.0083],
        about: "A savannah reserve known for big cats and the wildebeest migration.",
        notes: [
          {
            key: "plastic-bags",
            cat: "packing",
            title: "Kenya bans plastic carrier bags",
            place: "Maasai Mara",
            at: [-1.4061, 35.0083],
            body: "Kenya has a strict ban on single-use plastic carrier bags, and they may be confiscated on arrival.",
            lesson: "Pack in reusable bags rather than plastic carrier bags.",
          },
          {
            key: "river-crossings",
            cat: "planning",
            title: "River crossings are seasonal and unpredictable",
            place: "Mara River",
            at: [-1.55, 35.05],
            body: "The famous wildebeest river crossings happen in the migration season, but exactly when and where the herds cross is impossible to predict.",
            lesson: "Allow several days and set expectations for waiting.",
          },
        ],
      },
    ],
  },
  {
    country: "Namibia",
    destinations: [
      {
        slug: "sossusvlei",
        name: "Sossusvlei",
        region: "Hardap",
        at: [-24.7333, 15.2833],
        about: "Red dunes and white clay pans in the Namib Desert.",
        notes: [
          {
            key: "gravel-roads",
            cat: "transport",
            title: "Gravel roads and long distances",
            place: "Sesriem",
            at: [-24.4867, 15.8017],
            body: "Most roads to Sossusvlei are gravel, fuel stops are far apart, and driving after dark is risky.",
            lesson: "Fill up whenever you can, drive slowly on gravel, and arrive before dark.",
          },
        ],
      },
    ],
  },
];

export default countries;
