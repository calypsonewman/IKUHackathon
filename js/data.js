// Travel health dataset.
// Guidance is summarised from UK sources (NaTHNaC / TravelHealthPro, NHS fitfortravel, FCDO)
// and is intentionally general. Users are always pointed to the official pages and a clinician.

// nhsFree: usually free on the NHS from the GP practice you're registered with.
const VACCINES = {
  routine: {
    name: 'Routine UK vaccines',
    info: 'Make sure MMR, diphtheria, tetanus and polio are up to date before any trip. Check if you are eligible for flu and COVID-19 vaccines.',
    query: 'GP surgery',
    nhsFree: true,
  },
  hepA: {
    name: 'Hepatitis A',
    info: 'Spread through contaminated food and water. One dose protects for about a year; a booster 6–12 months later gives long-term protection.',
    query: 'travel vaccination clinic hepatitis A',
    nhsFree: true,
  },
  hepB: {
    name: 'Hepatitis B',
    info: 'Spread through blood and body fluids (medical/dental treatment, tattoos, sex). Usually 3 doses; accelerated schedules over 21 days are possible.',
    query: 'travel vaccination clinic hepatitis B',
  },
  typhoid: {
    name: 'Typhoid',
    info: 'Spread through contaminated food and water. Single injection (about 3 years protection) or oral capsules.',
    query: 'travel vaccination clinic typhoid',
    nhsFree: true,
  },
  rabies: {
    name: 'Rabies',
    info: 'Spread by bites, scratches or licks from infected animals (dogs, bats, monkeys). Pre-exposure course of 2–3 doses over 7–28 days. You still need urgent treatment after any bite.',
    query: 'travel clinic rabies vaccine',
  },
  je: {
    name: 'Japanese encephalitis',
    info: 'Spread by mosquitoes, mainly in rural rice-growing areas. 2 doses 28 days apart (7 days for some adults). Complete at least a week before travel.',
    query: 'travel clinic Japanese encephalitis vaccine',
  },
  tbe: {
    name: 'Tick-borne encephalitis',
    info: 'Spread by tick bites in forested areas, mainly spring to autumn. 2 doses 1–3 months apart; a third dose gives longer protection.',
    query: 'travel clinic tick-borne encephalitis vaccine',
  },
  yf: {
    name: 'Yellow fever',
    info: 'Spread by mosquitoes. Single dose given only at a registered yellow fever vaccination centre, at least 10 days before travel. You may need the certificate (ICVP) to enter.',
    query: 'yellow fever vaccination centre',
  },
  cholera: {
    name: 'Cholera',
    info: 'Spread through contaminated water. Oral vaccine, 2 doses 1–6 weeks apart. Usually only for aid workers or those visiting outbreak areas.',
    query: 'travel vaccination clinic cholera',
    nhsFree: true,
  },
  menacwy: {
    name: 'Meningitis ACWY',
    info: 'Spread through close contact. Single dose. Required by Saudi Arabia for Hajj and Umrah pilgrims.',
    query: 'travel clinic meningitis ACWY vaccine',
  },
};

// Regional profiles hold the defaults; countries can override.
const PROFILES = {
  westEU: {
    label: 'Western & Central Europe',
    most: [],
    some: [],
    malaria: ['none'],
    health: [
      'Carry your UK Global Health Insurance Card (GHIC) or EHIC, and also take out travel insurance.',
      'Use high-factor sunscreen and stay hydrated in summer heatwaves.',
      'Check for ticks after walks in forests or long grass.',
    ],
    travel: [
      'Check passport validity rules: many EU countries need at least 3 months left after your return date.',
      'Check the latest entry requirements (e.g. EU Entry/Exit System and ETIAS) before you go.',
    ],
  },
  eastEU: {
    label: 'Eastern Europe & Caucasus',
    most: [],
    some: ['hepA', 'hepB', 'rabies'],
    malaria: ['none'],
    health: [
      'Drink bottled or boiled water in rural areas.',
      'Avoid contact with stray dogs and wild animals; seek help immediately after any bite.',
      'Check for ticks after walks in forests or long grass.',
    ],
    travel: ['Check visa and entry requirements, which differ between countries in this region.'],
  },
  northAm: {
    label: 'North America',
    most: [],
    some: [],
    malaria: ['none'],
    health: [
      'Healthcare is very expensive: make sure your travel insurance has high medical cover.',
      'Protect against ticks (Lyme disease) and mosquitoes (West Nile virus) in summer.',
    ],
    travel: ['Check if you need an ESTA (USA) or eTA (Canada) before you travel.'],
  },
  centralAm: {
    label: 'Mexico & Central America',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies'],
    malaria: ['some', 'Low risk in some rural areas. Use mosquito bite avoidance; tablets are not usually needed for most tourist areas.'],
    health: [
      'Dengue, Zika and chikungunya are spread by daytime-biting mosquitoes: use DEET repellent and cover up.',
      'Zika: pregnant travellers or those planning pregnancy should get specialist advice before travel.',
      'Drink bottled or treated water and be careful with street food.',
    ],
    travel: ['Use registered taxis and avoid travelling between cities after dark.'],
  },
  caribbean: {
    label: 'Caribbean',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies'],
    malaria: ['none'],
    health: [
      'Dengue, Zika and chikungunya occur: use DEET repellent and cover up during the day.',
      'Zika: pregnant travellers or those planning pregnancy should get specialist advice before travel.',
      'Strong sun: use high-factor sunscreen and drink plenty of water.',
    ],
    travel: ['Hurricane season runs June to November: check forecasts and follow local advice.'],
  },
  southAmT: {
    label: 'Tropical South America',
    most: ['hepA', 'typhoid'],
    some: ['hepB', 'rabies'],
    yf: 'some',
    malaria: ['some', 'Risk in Amazon and rural lowland areas. Antimalarial tablets may be advised depending on your itinerary.'],
    health: [
      'Dengue and Zika are common: use DEET repellent and cover up during the day.',
      'Altitude sickness is a risk above 2,500m: ascend slowly and consider acetazolamide (ask a clinician).',
      'Drink bottled or treated water.',
    ],
    travel: ['Keep valuables out of sight and use registered taxis, especially in large cities.'],
  },
  southCone: {
    label: 'Southern South America',
    most: [],
    some: ['hepA', 'hepB', 'rabies'],
    malaria: ['none'],
    health: [
      'Strong UV, especially in Patagonia and at altitude: use sunscreen and sunglasses.',
      'Altitude sickness is a risk in the Andes above 2,500m.',
    ],
    travel: ['Weather in Patagonia and the Andes changes quickly: plan hikes carefully.'],
  },
  northAf: {
    label: 'North Africa',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies'],
    malaria: ['none'],
    health: [
      'Travellers\' diarrhoea is common: drink bottled water and eat freshly cooked food.',
      'Avoid stray dogs and cats; rabies is present.',
      'High temperatures: avoid the midday sun and stay hydrated.',
    ],
    travel: ['Dress modestly at religious sites and respect local customs, especially during Ramadan.'],
  },
  ssa: {
    label: 'Sub-Saharan Africa',
    most: ['hepA', 'typhoid'],
    some: ['hepB', 'rabies', 'cholera', 'menacwy'],
    yf: 'most',
    malaria: ['high', 'High risk. Antimalarial tablets are usually advised, along with mosquito nets and DEET repellent.'],
    health: [
      'Malaria is the biggest risk: if you get a fever during or up to a year after travel, get urgent medical help and mention your trip.',
      'Avoid swimming in fresh water (lakes, rivers) because of schistosomiasis (bilharzia).',
      'Drink bottled or treated water.',
    ],
    travel: ['Check FCDO advice for regional security warnings before you book.'],
  },
  southAf: {
    label: 'Southern Africa',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies'],
    yf: 'cert',
    malaria: ['some', 'Risk in some areas (e.g. game reserves and northern regions). Antimalarial tablets may be advised.'],
    health: [
      'Avoid swimming in fresh water because of schistosomiasis (bilharzia).',
      'Use DEET repellent and sleep under a net in malaria areas.',
    ],
    travel: ['Avoid isolated areas after dark and keep valuables out of sight.'],
  },
  middleEast: {
    label: 'Middle East',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies'],
    malaria: ['none'],
    health: [
      'Extreme summer heat: avoid the midday sun, drink plenty of water.',
      'Avoid contact with camels and raw camel milk (MERS risk).',
    ],
    travel: [
      'Respect local laws and customs, which can be very different from the UK (dress, alcohol, public behaviour).',
      'Some medicines legal in the UK are controlled here: check before you travel.',
    ],
  },
  southAsia: {
    label: 'South Asia',
    most: ['hepA', 'typhoid'],
    some: ['hepB', 'rabies', 'je', 'cholera'],
    yf: 'cert',
    malaria: ['some', 'Risk varies by region and season. Antimalarial tablets may be advised for some areas.'],
    health: [
      'Travellers\' diarrhoea is very common: drink bottled water, avoid ice and salads.',
      'Dengue occurs: use DEET repellent during the day.',
      'Air pollution can be severe in large cities in winter.',
    ],
    travel: ['Road safety is a major risk: use reputable drivers and wear seatbelts where available.'],
  },
  seAsia: {
    label: 'South-East Asia',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies', 'je'],
    yf: 'cert',
    malaria: ['some', 'Risk mainly in rural and forested border areas. Most tourist areas are low risk.'],
    health: [
      'Dengue is common: use DEET repellent during the day and night.',
      'Avoid touching dogs and monkeys; get urgent help after any bite or scratch.',
      'Drink bottled water and be careful with ice and street food.',
    ],
    travel: ['Wear a helmet on scooters and check your insurance covers riding one.'],
  },
  eastAsia: {
    label: 'East Asia',
    most: [],
    some: ['hepA', 'hepB', 'rabies', 'je', 'typhoid'],
    malaria: ['none'],
    health: ['Air pollution can be high in big cities.', 'Drink bottled or boiled water.'],
    travel: ['Check visa requirements before you travel.'],
  },
  eastAsiaDev: {
    label: 'East Asia',
    most: [],
    some: ['hepB', 'je'],
    malaria: ['none'],
    health: [
      'Healthcare is excellent but can be expensive: take travel insurance.',
      'Japanese encephalitis vaccine may be advised for long stays in rural areas.',
    ],
    travel: ['Some common UK medicines (e.g. some cold remedies with pseudoephedrine) are restricted: check before you go.'],
  },
  centralAsia: {
    label: 'Central Asia',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies', 'tbe'],
    malaria: ['none'],
    health: ['Altitude sickness is a risk in mountainous areas.', 'Drink bottled or boiled water.'],
    travel: ['Register with local authorities if required and carry your passport.'],
  },
  oceaniaDev: {
    label: 'Australia & New Zealand',
    most: [],
    some: [],
    malaria: ['none'],
    health: [
      'Very strong UV: use high-factor sunscreen, a hat and sunglasses.',
      'Follow advice on dangerous wildlife and swim between the flags on beaches.',
    ],
    travel: ['You need a visa or electronic travel authority before you fly.'],
  },
  pacific: {
    label: 'Pacific Islands',
    most: ['hepA'],
    some: ['hepB', 'typhoid', 'rabies'],
    malaria: ['none'],
    health: ['Dengue and Zika occur: use DEET repellent during the day.', 'Strong sun: use sunscreen and stay hydrated.'],
    travel: ['Cyclone season runs roughly November to April.'],
  },
  polar: {
    label: 'Antarctica',
    most: [],
    some: [],
    malaria: ['none'],
    health: ['Extreme cold and UV. Medical facilities are very limited, so get a check-up before you go.'],
    travel: ['Travel is only possible with organised expeditions.'],
  },
};

// Countries keyed by ISO 3166-1 numeric code (as used by world-atlas).
// opts: yf ('most' | 'some' | 'cert' | 'none'), tbe (true), malaria ([level, note]),
//       addMost / addSome (vaccine keys), em (emergency numbers), fcdo (gov.uk slug), health/travel (extra notes)
const COUNTRIES = {};
function c(code, name, profile, opts = {}) {
  COUNTRIES[code] = { code, name, profile, ...opts };
}

// Europe
c('250', 'France', 'westEU', { em: '112 (EU) · 15 ambulance', fcdo: 'france' });
c('724', 'Spain', 'westEU', { em: '112', fcdo: 'spain' });
c('380', 'Italy', 'westEU', { em: '112', fcdo: 'italy' });
c('276', 'Germany', 'westEU', { tbe: true, em: '112', fcdo: 'germany' });
c('620', 'Portugal', 'westEU', { em: '112', fcdo: 'portugal' });
c('300', 'Greece', 'westEU', { em: '112', fcdo: 'greece', health: ['West Nile virus occurs in summer: avoid mosquito bites.'] });
c('826', 'United Kingdom', 'westEU', { em: '999 or 112' });
c('372', 'Ireland', 'westEU', { em: '112 or 999', fcdo: 'ireland' });
c('528', 'Netherlands', 'westEU', { em: '112', fcdo: 'netherlands' });
c('056', 'Belgium', 'westEU', { em: '112', fcdo: 'belgium' });
c('442', 'Luxembourg', 'westEU', { em: '112' });
c('756', 'Switzerland', 'westEU', { tbe: true, em: '112 · 144 ambulance', fcdo: 'switzerland' });
c('040', 'Austria', 'westEU', { tbe: true, em: '112', fcdo: 'austria' });
c('208', 'Denmark', 'westEU', { em: '112' });
c('752', 'Sweden', 'westEU', { tbe: true, em: '112', fcdo: 'sweden' });
c('578', 'Norway', 'westEU', { tbe: true, em: '112 · 113 ambulance', fcdo: 'norway' });
c('246', 'Finland', 'westEU', { tbe: true, em: '112', fcdo: 'finland' });
c('352', 'Iceland', 'westEU', { em: '112', fcdo: 'iceland', travel: ['Check road conditions and volcanic activity alerts before driving.'] });
c('470', 'Malta', 'westEU', { em: '112' });
c('196', 'Cyprus', 'westEU', { em: '112', fcdo: 'cyprus' });
c('203', 'Czechia', 'westEU', { tbe: true, em: '112', fcdo: 'czech-republic' });
c('616', 'Poland', 'westEU', { tbe: true, em: '112', fcdo: 'poland' });
c('703', 'Slovakia', 'westEU', { tbe: true, em: '112' });
c('705', 'Slovenia', 'westEU', { tbe: true, em: '112' });
c('191', 'Croatia', 'westEU', { tbe: true, em: '112', fcdo: 'croatia' });
c('348', 'Hungary', 'westEU', { tbe: true, em: '112', fcdo: 'hungary' });
c('233', 'Estonia', 'westEU', { tbe: true, em: '112' });
c('428', 'Latvia', 'westEU', { tbe: true, em: '112' });
c('440', 'Lithuania', 'westEU', { tbe: true, em: '112' });
['020', '492', '674', '438', '336', '248', '234', '831', '832', '833'].forEach((k) => c(k, null, 'westEU', { em: '112' }));
c('642', 'Romania', 'eastEU', { tbe: true, em: '112' });
c('100', 'Bulgaria', 'eastEU', { em: '112', fcdo: 'bulgaria' });
c('688', 'Serbia', 'eastEU', { em: '112 · 194 ambulance' });
c('070', 'Bosnia and Herzegovina', 'eastEU', { em: '112' });
c('499', 'Montenegro', 'eastEU', { em: '112' });
c('807', 'North Macedonia', 'eastEU', { em: '112' });
c('008', 'Albania', 'eastEU', { em: '112' });
c('498', 'Moldova', 'eastEU', { em: '112' });
c('804', 'Ukraine', 'eastEU', { em: '112', health: [], travel: ['The FCDO advises against travel to Ukraine due to the war. Check the latest advice.'] });
c('112', 'Belarus', 'eastEU', { tbe: true, travel: ['Check FCDO advice: travel restrictions may apply.'] });
c('643', 'Russia', 'eastEU', { tbe: true, em: '112', travel: ['The FCDO advises against travel to Russia. Check the latest advice.'] });
c('268', 'Georgia', 'eastEU', { em: '112' });
c('051', 'Armenia', 'eastEU', { em: '112' });
c('031', 'Azerbaijan', 'eastEU', { em: '112' });

// North America
c('840', 'United States', 'northAm', { em: '911', fcdo: 'usa' });
c('124', 'Canada', 'northAm', { em: '911', fcdo: 'canada' });
c('304', 'Greenland', 'northAm', { em: '112' });
c('060', 'Bermuda', 'caribbean', { em: '911' });

// Central America & Caribbean
c('484', 'Mexico', 'centralAm', { em: '911', fcdo: 'mexico' });
c('320', 'Guatemala', 'centralAm', { em: '110 police · 122 ambulance' });
c('084', 'Belize', 'centralAm', { em: '911' });
c('222', 'El Salvador', 'centralAm', { em: '911' });
c('340', 'Honduras', 'centralAm', { em: '911' });
c('558', 'Nicaragua', 'centralAm', {});
c('188', 'Costa Rica', 'centralAm', { em: '911', fcdo: 'costa-rica' });
c('591', 'Panama', 'centralAm', { yf: 'some', addMost: ['typhoid'], em: '911', malaria: ['some', 'Risk in eastern provinces (Darién and Guna Yala). Antimalarial tablets may be advised there.'] });
c('192', 'Cuba', 'caribbean', { em: '106 police · 104 ambulance', fcdo: 'cuba' });
c('388', 'Jamaica', 'caribbean', { em: '119 police · 110 ambulance', fcdo: 'jamaica' });
c('332', 'Haiti', 'caribbean', { addMost: ['typhoid'], addSome: ['cholera'], malaria: ['high', 'Risk throughout the country. Antimalarial tablets are usually advised.'], travel: ['The FCDO advises against all travel to Haiti. Check the latest advice.'] });
c('214', 'Dominican Republic', 'caribbean', { em: '911', fcdo: 'dominican-republic', malaria: ['some', 'Low risk in some western provinces. Use mosquito bite avoidance.'] });
c('044', 'Bahamas', 'caribbean', { em: '911 or 919' });
c('780', 'Trinidad and Tobago', 'caribbean', { yf: 'some', em: '999 police · 811 ambulance' });
c('630', 'Puerto Rico', 'caribbean', { em: '911' });
c('052', 'Barbados', 'caribbean', { em: '211 police · 511 ambulance' });
['028', '092', '136', '212', '308', '500', '531', '533', '534', '652', '659', '660', '662', '663', '670', '796', '850'].forEach((k) => c(k, null, 'caribbean'));

// South America
c('076', 'Brazil', 'southAmT', { em: '190 police · 192 ambulance', fcdo: 'brazil', malaria: ['some', 'Risk mainly in the Amazon region. Little or no risk in Rio, São Paulo, Iguaçu Falls and coastal cities.'] });
c('604', 'Peru', 'southAmT', { em: '105 police · 106 ambulance', fcdo: 'peru', malaria: ['some', 'Risk in Amazon areas (e.g. Iquitos, Puerto Maldonado). No risk in Lima, Cusco or Machu Picchu.'] });
c('170', 'Colombia', 'southAmT', { em: '123', fcdo: 'colombia' });
c('068', 'Bolivia', 'southAmT', { em: '110 police · 118 ambulance', fcdo: 'bolivia' });
c('218', 'Ecuador', 'southAmT', { em: '911', fcdo: 'ecuador', health: ['Galápagos: no yellow fever risk, but you may need proof of vaccination if arriving from a risk area.'] });
c('862', 'Venezuela', 'southAmT', { em: '911', travel: ['The FCDO advises against travel to parts of Venezuela. Check the latest advice.'] });
c('328', 'Guyana', 'southAmT', { yf: 'most', malaria: ['high', 'Risk in interior regions. Antimalarial tablets usually advised.'] });
c('740', 'Suriname', 'southAmT', { yf: 'most' });
c('600', 'Paraguay', 'southAmT', { malaria: ['none'], em: '911' });
c('032', 'Argentina', 'southCone', { yf: 'some', em: '911 · 107 ambulance', fcdo: 'argentina', health: ['Yellow fever vaccine may be advised for the north-east (e.g. Iguazú Falls).'] });
c('152', 'Chile', 'southCone', { em: '133 police · 131 ambulance', fcdo: 'chile' });
c('858', 'Uruguay', 'southCone', { em: '911' });
c('238', 'Falkland Islands', 'southCone', { em: '999' });
c('239', null, 'polar');

// North Africa
c('504', 'Morocco', 'northAf', { em: '19 police · 15 ambulance', fcdo: 'morocco' });
c('012', 'Algeria', 'northAf', {});
c('788', 'Tunisia', 'northAf', { em: '197 police · 190 ambulance', fcdo: 'tunisia' });
c('434', 'Libya', 'northAf', { travel: ['The FCDO advises against all travel to Libya.'] });
c('818', 'Egypt', 'northAf', { addMost: ['typhoid'], em: '122 police · 123 ambulance', fcdo: 'egypt', health: ['Avoid swimming in the Nile and other fresh water (schistosomiasis).'] });
c('732', 'Western Sahara', 'northAf', {});

// Sub-Saharan Africa (yellow fever belt by default)
c('566', 'Nigeria', 'ssa', { em: '112', fcdo: 'nigeria' });
c('288', 'Ghana', 'ssa', { em: '112 · 193 ambulance', fcdo: 'ghana' });
c('384', "Côte d'Ivoire", 'ssa', {});
c('686', 'Senegal', 'ssa', {});
c('270', 'The Gambia', 'ssa', { fcdo: 'the-gambia' });
c('324', 'Guinea', 'ssa', {});
c('624', 'Guinea-Bissau', 'ssa', {});
c('694', 'Sierra Leone', 'ssa', {});
c('430', 'Liberia', 'ssa', {});
c('466', 'Mali', 'ssa', {});
c('854', 'Burkina Faso', 'ssa', {});
c('562', 'Niger', 'ssa', {});
c('148', 'Chad', 'ssa', {});
c('120', 'Cameroon', 'ssa', {});
c('140', 'Central African Republic', 'ssa', {});
c('178', 'Republic of the Congo', 'ssa', {});
c('180', 'DR Congo', 'ssa', {});
c('266', 'Gabon', 'ssa', {});
c('226', 'Equatorial Guinea', 'ssa', {});
c('678', 'São Tomé and Príncipe', 'ssa', {});
c('204', 'Benin', 'ssa', {});
c('768', 'Togo', 'ssa', {});
c('478', 'Mauritania', 'ssa', { yf: 'some' });
c('728', 'South Sudan', 'ssa', {});
c('729', 'Sudan', 'ssa', { yf: 'some', travel: ['The FCDO advises against all travel to Sudan.'] });
c('231', 'Ethiopia', 'ssa', { yf: 'some', em: '991 police · 907 ambulance', fcdo: 'ethiopia', health: ['Altitude: Addis Ababa is at 2,355m, take it easy for the first few days.'] });
c('404', 'Kenya', 'ssa', { yf: 'some', em: '999 or 112', fcdo: 'kenya', malaria: ['high', 'Risk in most areas including the coast and safari parks. Low risk in central Nairobi and the highlands above 2,500m.'] });
c('800', 'Uganda', 'ssa', { em: '999 or 112', fcdo: 'uganda' });
c('108', 'Burundi', 'ssa', {});
c('024', 'Angola', 'ssa', {});
c('834', 'Tanzania', 'ssa', { yf: 'cert', em: '112', fcdo: 'tanzania', health: ['Zanzibar: yellow fever certificate may be checked if arriving from a risk country.'] });
c('646', 'Rwanda', 'ssa', { yf: 'cert' });
c('706', 'Somalia', 'ssa', { yf: 'cert', travel: ['The FCDO advises against all travel to Somalia.'] });
c('232', 'Eritrea', 'ssa', { yf: 'cert' });
c('262', 'Djibouti', 'ssa', { yf: 'cert' });

// Southern Africa
c('710', 'South Africa', 'southAf', { em: '10111 police · 10177 ambulance · 112 mobile', fcdo: 'south-africa', malaria: ['some', 'Risk in north-east (including Kruger National Park). No risk in Cape Town, Johannesburg or the Garden Route.'] });
c('516', 'Namibia', 'southAf', {});
c('072', 'Botswana', 'southAf', {});
c('716', 'Zimbabwe', 'southAf', {});
c('894', 'Zambia', 'southAf', { yf: 'some', malaria: ['high', 'Risk throughout. Antimalarial tablets usually advised.'] });
c('508', 'Mozambique', 'southAf', { malaria: ['high', 'Risk throughout. Antimalarial tablets usually advised.'] });
c('454', 'Malawi', 'southAf', { malaria: ['high', 'Risk throughout. Antimalarial tablets usually advised.'] });
c('450', 'Madagascar', 'southAf', { malaria: ['high', 'Risk throughout most of the island.'] });
c('426', 'Lesotho', 'southAf', { malaria: ['none'] });
c('748', 'Eswatini', 'southAf', {});
c('480', 'Mauritius', 'southAf', { malaria: ['none'], em: '999 police · 114 ambulance' });
c('690', 'Seychelles', 'southAf', { malaria: ['none'] });
c('174', 'Comoros', 'southAf', { malaria: ['high', 'Risk throughout.'] });
c('132', 'Cabo Verde', 'southAf', { malaria: ['none'] });
['654', '086', '260', '334'].forEach((k) => c(k, null, 'southAf', { malaria: ['none'] }));

// Middle East
c('682', 'Saudi Arabia', 'middleEast', { addMost: ['menacwy'], em: '911', fcdo: 'saudi-arabia', health: ['Hajj & Umrah: a Meningitis ACWY certificate is required. Check current Saudi requirements for other vaccines.'] });
c('784', 'United Arab Emirates', 'middleEast', { em: '999 police · 998 ambulance', fcdo: 'united-arab-emirates' });
c('634', 'Qatar', 'middleEast', { em: '999', fcdo: 'qatar' });
c('048', 'Bahrain', 'middleEast', { em: '999' });
c('414', 'Kuwait', 'middleEast', { em: '112' });
c('512', 'Oman', 'middleEast', { em: '9999', fcdo: 'oman' });
c('887', 'Yemen', 'middleEast', { addMost: ['typhoid'], addSome: ['cholera'], malaria: ['some', 'Risk below 2,000m.'], travel: ['The FCDO advises against all travel to Yemen.'] });
c('400', 'Jordan', 'middleEast', { em: '911', fcdo: 'jordan' });
c('376', 'Israel', 'middleEast', { em: '100 police · 101 ambulance', fcdo: 'israel' });
c('275', 'Palestine', 'middleEast', { travel: ['Check FCDO advice, which currently advises against travel to many areas.'] });
c('422', 'Lebanon', 'middleEast', {});
c('760', 'Syria', 'middleEast', { travel: ['The FCDO advises against all travel to Syria.'] });
c('368', 'Iraq', 'middleEast', { addMost: ['typhoid'] });
c('364', 'Iran', 'middleEast', { travel: ['The FCDO advises against all travel to Iran.'] });
c('792', 'Turkey', 'middleEast', { em: '112', fcdo: 'turkey' });

// South Asia
c('356', 'India', 'southAsia', { em: '112', fcdo: 'india', malaria: ['some', 'Risk varies by state; higher during and after the monsoon. Check your itinerary with a travel clinic.'] });
c('524', 'Nepal', 'southAsia', { em: '100 police · 102 ambulance', fcdo: 'nepal', health: ['Trekking: altitude sickness is a serious risk above 2,500m. Ascend slowly and know the symptoms.'] });
c('586', 'Pakistan', 'southAsia', { em: '15 police · 1122 ambulance', fcdo: 'pakistan', health: ['Polio: if staying more than 4 weeks you may need a polio booster recorded on a certificate to leave the country.'] });
c('050', 'Bangladesh', 'southAsia', { em: '999', fcdo: 'bangladesh' });
c('144', 'Sri Lanka', 'southAsia', { em: '119 police · 1990 ambulance', fcdo: 'sri-lanka', malaria: ['none', 'Sri Lanka is certified malaria-free. Dengue is still common.'] });
c('064', 'Bhutan', 'southAsia', {});
c('462', 'Maldives', 'southAsia', { most: ['hepA'], em: '119 police · 102 ambulance', fcdo: 'maldives', malaria: ['none'] });
c('004', 'Afghanistan', 'southAsia', { health: ['Polio: you may need proof of polio vaccination to leave.'], travel: ['The FCDO advises against all travel to Afghanistan.'] });

// South-East Asia
c('764', 'Thailand', 'seAsia', { em: '191 police · 1669 ambulance · 1155 tourist police', fcdo: 'thailand', malaria: ['some', 'Risk in rural forested border areas. No risk in Bangkok, Phuket, Koh Samui or Chiang Mai city.'] });
c('704', 'Vietnam', 'seAsia', { em: '113 police · 115 ambulance', fcdo: 'vietnam' });
c('116', 'Cambodia', 'seAsia', { em: '117 police · 119 ambulance', fcdo: 'cambodia' });
c('418', 'Laos', 'seAsia', { fcdo: 'laos' });
c('104', 'Myanmar', 'seAsia', { travel: ['Check FCDO advice: travel is advised against in many areas.'] });
c('360', 'Indonesia', 'seAsia', { em: '112 · 118 ambulance', fcdo: 'indonesia', health: ['Bali: rabies is present; avoid all contact with dogs and monkeys.'] });
c('608', 'Philippines', 'seAsia', { em: '911', fcdo: 'philippines' });
c('458', 'Malaysia', 'seAsia', { em: '999', fcdo: 'malaysia' });
c('096', 'Brunei', 'seAsia', {});
c('626', 'Timor-Leste', 'seAsia', {});

// East Asia
c('156', 'China', 'eastAsia', { em: '110 police · 120 ambulance', fcdo: 'china' });
c('496', 'Mongolia', 'eastAsia', {});
c('408', 'North Korea', 'eastAsia', { travel: ['The FCDO advises against all travel to North Korea.'] });
c('392', 'Japan', 'eastAsiaDev', { em: '110 police · 119 ambulance', fcdo: 'japan' });
c('410', 'South Korea', 'eastAsiaDev', { em: '112 police · 119 ambulance', fcdo: 'south-korea' });
c('158', 'Taiwan', 'eastAsiaDev', { em: '110 police · 119 ambulance', fcdo: 'taiwan' });
c('344', 'Hong Kong', 'eastAsiaDev', { em: '999', fcdo: 'hong-kong' });
c('446', 'Macao', 'eastAsiaDev', { em: '999' });
c('702', 'Singapore', 'eastAsiaDev', { addSome: ['hepA'], em: '999 police · 995 ambulance', fcdo: 'singapore', health: ['Dengue occurs: use DEET repellent.'] });

// Central Asia
c('398', 'Kazakhstan', 'centralAsia', { em: '112' });
c('860', 'Uzbekistan', 'centralAsia', {});
c('795', 'Turkmenistan', 'centralAsia', {});
c('762', 'Tajikistan', 'centralAsia', {});
c('417', 'Kyrgyzstan', 'centralAsia', {});

// Oceania
c('036', 'Australia', 'oceaniaDev', { em: '000 (112 from mobile)', fcdo: 'australia', addSome: ['je'], health: ['Japanese encephalitis vaccine may be advised for some rural areas in northern Australia.'] });
c('554', 'New Zealand', 'oceaniaDev', { em: '111', fcdo: 'new-zealand' });
c('574', 'Norfolk Island', 'oceaniaDev', {});
c('598', 'Papua New Guinea', 'pacific', { addSome: ['je'], malaria: ['high', 'Risk throughout below 1,800m. Antimalarial tablets usually advised.'] });
c('090', 'Solomon Islands', 'pacific', { malaria: ['high', 'Risk throughout. Antimalarial tablets usually advised.'] });
c('548', 'Vanuatu', 'pacific', { malaria: ['some', 'Risk on most islands.'] });
c('242', 'Fiji', 'pacific', { em: '917 police · 911 ambulance', fcdo: 'fiji' });
['016', '184', '258', '296', '316', '520', '540', '570', '580', '583', '584', '585', '612', '776', '876', '882'].forEach((k) => c(k, null, 'pacific'));
c('010', 'Antarctica', 'polar');
c('666', null, 'northAm');

// Features without an ISO id in world-atlas
const NAMED_COUNTRIES = {
  Kosovo: { code: 'XKX', name: 'Kosovo', profile: 'eastEU', em: '112' },
  Somaliland: { code: 'SOL', name: 'Somaliland', profile: 'ssa', yf: 'cert' },
  'N. Cyprus': { code: 'NCY', name: 'Northern Cyprus', profile: 'westEU' },
  'Siachen Glacier': { code: 'SIA', name: 'Siachen Glacier', profile: 'southAsia' },
  'Indian Ocean Ter.': { code: 'IOT', name: 'Indian Ocean Territories', profile: 'oceaniaDev' },
};

// Popular destinations shown as clickable markers, with city-specific advice.
const CITIES = [
  { name: 'Paris', cc: '250', ll: [48.86, 2.35] },
  { name: 'Barcelona', cc: '724', ll: [41.39, 2.17] },
  { name: 'Rome', cc: '380', ll: [41.9, 12.5] },
  { name: 'Reykjavík', cc: '352', ll: [64.15, -21.94] },
  { name: 'Istanbul', cc: '792', ll: [41.01, 28.98] },
  { name: 'New York', cc: '840', ll: [40.71, -74.0] },
  { name: 'Orlando', cc: '840', ll: [28.54, -81.38], note: 'Theme park queues in summer heat: drink plenty of water and use sunscreen.' },
  { name: 'Cancún', cc: '484', ll: [21.16, -86.85], note: 'Watch for sargassum seaweed and strong currents; follow beach flag warnings.' },
  { name: 'Havana', cc: '192', ll: [23.11, -82.37] },
  { name: 'Kingston', cc: '388', ll: [18.0, -76.79] },
  { name: 'Punta Cana', cc: '214', ll: [18.58, -68.4] },
  { name: 'Rio de Janeiro', cc: '076', ll: [-22.91, -43.17], note: 'Yellow fever vaccine is recommended for Rio de Janeiro state. Dengue is common in summer.' },
  { name: 'Manaus (Amazon)', cc: '076', ll: [-3.12, -60.02], note: 'Amazon region: yellow fever vaccine recommended and antimalarial tablets often advised.' },
  { name: 'Lima', cc: '604', ll: [-12.05, -77.04], note: 'No yellow fever or malaria risk in Lima itself.' },
  { name: 'Cusco & Machu Picchu', cc: '604', ll: [-13.53, -71.97], note: 'Cusco is at 3,400m: altitude sickness is common. Rest on arrival and avoid alcohol for the first 24–48 hours.' },
  { name: 'La Paz', cc: '068', ll: [-16.5, -68.15], note: 'One of the highest cities in the world (~3,600m). Plan for acclimatisation.' },
  { name: 'Bogotá', cc: '170', ll: [4.71, -74.07], note: 'At 2,600m altitude. No yellow fever or malaria risk in the city.' },
  { name: 'Cartagena', cc: '170', ll: [10.39, -75.48] },
  { name: 'Buenos Aires', cc: '032', ll: [-34.6, -58.38] },
  { name: 'Marrakech', cc: '504', ll: [31.63, -7.98] },
  { name: 'Cairo', cc: '818', ll: [30.04, 31.24] },
  { name: 'Lagos', cc: '566', ll: [6.52, 3.38] },
  { name: 'Accra', cc: '288', ll: [5.6, -0.19] },
  { name: 'Nairobi', cc: '404', ll: [-1.29, 36.82], note: 'Low malaria risk in central Nairobi, but higher on safari and the coast.' },
  { name: 'Zanzibar', cc: '834', ll: [-6.16, 39.2], note: 'Malaria risk present: antimalarial tablets usually advised.' },
  { name: 'Cape Town', cc: '710', ll: [-33.92, 18.42], note: 'No malaria risk in Cape Town.' },
  { name: 'Kruger National Park', cc: '710', ll: [-24.0, 31.5], note: 'Malaria risk area: antimalarial tablets may be advised, especially Oct–May.' },
  { name: 'Dubai', cc: '784', ll: [25.2, 55.27] },
  { name: 'Mecca (Hajj/Umrah)', cc: '682', ll: [21.42, 39.83], note: 'Meningitis ACWY certificate required. Heat exhaustion and crowd injuries are major risks.' },
  { name: 'Delhi', cc: '356', ll: [28.61, 77.21], note: 'Air pollution is severe Oct–Feb. Dengue peaks after the monsoon.' },
  { name: 'Mumbai', cc: '356', ll: [19.08, 72.88] },
  { name: 'Goa', cc: '356', ll: [15.3, 74.12] },
  { name: 'Kathmandu', cc: '524', ll: [27.72, 85.32] },
  { name: 'Colombo', cc: '144', ll: [6.93, 79.86] },
  { name: 'Malé', cc: '462', ll: [4.18, 73.51] },
  { name: 'Bangkok', cc: '764', ll: [13.76, 100.5] },
  { name: 'Phuket', cc: '764', ll: [7.88, 98.39] },
  { name: 'Hanoi', cc: '704', ll: [21.03, 105.85] },
  { name: 'Ho Chi Minh City', cc: '704', ll: [10.82, 106.63] },
  { name: 'Siem Reap', cc: '116', ll: [13.36, 103.86] },
  { name: 'Bali', cc: '360', ll: [-8.65, 115.22], note: 'Rabies is present on Bali. Avoid monkeys at temples and stray dogs.' },
  { name: 'Manila', cc: '608', ll: [14.6, 120.98] },
  { name: 'Kuala Lumpur', cc: '458', ll: [3.14, 101.69] },
  { name: 'Singapore', cc: '702', ll: [1.35, 103.82] },
  { name: 'Beijing', cc: '156', ll: [39.9, 116.4] },
  { name: 'Tokyo', cc: '392', ll: [35.68, 139.69] },
  { name: 'Seoul', cc: '410', ll: [37.57, 126.98] },
  { name: 'Sydney', cc: '036', ll: [-33.87, 151.21] },
  { name: 'Cairns', cc: '036', ll: [-16.92, 145.77], note: 'Box jellyfish season Nov–May: swim in netted areas and wear a stinger suit.' },
  { name: 'Auckland', cc: '554', ll: [-36.85, 174.76] },
];

// Turn raw data into the advice shown in the panel.
function buildAdvice(country, city) {
  const p = PROFILES[country.profile] || PROFILES.westEU;
  const most = new Set(['routine', ...(country.most || p.most), ...(country.addMost || [])]);
  const some = new Set([...(country.some || p.some), ...(country.addSome || [])]);
  const yf = country.yf || p.yf || 'none';
  const notes = {};

  if (yf === 'most') most.add('yf');
  if (yf === 'some') { some.add('yf'); notes.yf = 'Recommended for some areas of this country. Check your itinerary with a travel clinic.'; }
  if (yf === 'cert') notes.yfCert = true;
  if (country.tbe) { some.add('tbe'); notes.tbe = 'For those walking, camping or working in forested areas.'; }
  most.forEach((v) => some.delete(v));

  const malaria = country.malaria || p.malaria;
  const health = [...(city?.note ? [city.note] : []), ...(country.health || []), ...p.health];
  if (malaria[0] !== 'none' || malaria[1]) health.unshift('Malaria: ' + (malaria[1] || 'Risk present.'));
  health.push('See a GP practice nurse, pharmacist or travel clinic ideally 6–8 weeks before you travel.');

  const travel = [...(country.travel || []), ...p.travel];
  if (notes.yfCert) travel.push('A yellow fever certificate may be required if you arrive from (or have transited through) a yellow fever risk country.');
  travel.push(`Emergency number: ${country.em || 'check before you travel'}.`);
  travel.push('Get comprehensive travel insurance that covers any pre-existing medical conditions.');

  const fcdoUrl = country.fcdo ? `https://www.gov.uk/foreign-travel-advice/${country.fcdo}` : 'https://www.gov.uk/foreign-travel-advice';

  return {
    title: city ? `${city.name}, ${country.name}` : country.name,
    region: p.label,
    most: [...most],
    some: [...some],
    notes,
    malaria: malaria[0],
    yf,
    health,
    travel,
    fcdoUrl,
  };
}

// Colour band for the choropleth.
function riskLevel(country) {
  const a = buildAdvice(country);
  if (a.malaria === 'high' || a.yf === 'most') return 3;
  if (a.most.length > 1 || a.yf === 'some' || a.malaria === 'some') return 2;
  if (a.some.length > 0) return 1;
  return 0;
}
