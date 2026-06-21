/* ============================================================================
 * HARIT PATHSALA — हरित पाठशाला
 * logic.js — single source of truth for all data + math (no UI, no framework)
 * Nepal Climate Hackathon 2025
 * ----------------------------------------------------------------------------
 * Sources:
 *   NEA   = Nepal Electricity Authority Annual Report 2024
 *   IPCC  = IPCC AR6 / IPCC 2006 Guidelines for National GHG Inventories
 *   GHG   = GHG Protocol Corporate Standard (WBCSD/WRI)
 *   DEFRA = UK DEFRA 2023 Emission Factor Database (vehicles)
 * ==========================================================================*/

/* ─── Emission Factors ───────────────────────────────────────────────────*/
export const EF = {
  // ELECTRICITY
  nepal_grid_kwh:   0.12,   // kg CO2e/kWh — Nepal grid = 82.5% hydro + 17.5% India import; hydro lifecycle ~0.024 + India 0.716 -> blended ~0.12 (IEA 2023; CEA 2024; Nepal LCA 2025)
  solar_kwh:        0.04,   // kg CO2e/kWh — lifecycle

  // TRANSPORT (per km, per person, one-way)
  walk:             0.000,
  bicycle:          0.000,
  public_bus:       0.089,  // GHG Protocol South Asia shared bus
  microbus:         0.113,  // Nepal microbus estimate
  motorbike:        0.068,  // shared motorbike passenger (DEFRA)
  private_car:      0.192,  // DEFRA 2023 avg petrol car

  // COOKING FUELS
  lpg_per_kg:       2.983,  // IPCC 2006 Table 2.2
  firewood_per_kg:  1.747,  // IPCC incomplete combustion (open fire ~25% eff.)
  induction_per_kwh:0.12,   // uses Nepal (hydro-dominant) grid — genuinely clean

  // FOOD (per meal, per person)
  dal_bhat_local:   0.35,
  packaged_food:    1.20,
  meat_heavy:       2.50,
  vegetarian_canteen:0.50,

  // WASTE (per kg waste)
  compost:          0.06,
  municipal_bin:    0.50,
  open_burning:     2.10,
  open_dump:        0.70,

  // WATER
  water_per_litre:  0.0003,

  // SCHOOL ELECTRICITY PROFILES (kWh/day, whole school)
  school_minimal_kwh:  8,
  school_moderate_kwh: 20,
  school_heavy_kwh:    45,

  // CARBON SEQUESTRATION
  tree_per_year_kg: 21.0,
  tree_per_day_kg:  0.0575, // 21 / 365
};

/* ─── Calculation engine ─────────────────────────────────────────────────*/
// All internal values in kg CO2e per DAY.
export function calculateFootprint(answers) {
  const r = {}; // breakdown by category

  // 1. TRANSPORT — round trip (×2)
  const factor = EF[answers.transportMode] ?? EF.public_bus;
  r.transport = factor * answers.distanceKm * 2;

  // 2. HOME ELECTRICITY — 300 W avg household draw per active hour
  const homeKwh = 0.3 * answers.electricityHours;
  r.electricity_home = homeKwh * (answers.hasSolar ? EF.solar_kwh : EF.nepal_grid_kwh);

  // 3. COOKING — amortised to per-day student share (÷5 household members)
  if (answers.cookingFuel ==='lpg') {
    r.cooking = (answers.lpgKgMonth / 30 / 5) * EF.lpg_per_kg;
  } else if (answers.cookingFuel ==='firewood') {
    r.cooking = (answers.firewoodKgDay / 5) * EF.firewood_per_kg;
  } else if (answers.cookingFuel ==='electric') {
    r.cooking = (1.5 * 3 / 5) * EF.nepal_grid_kwh; // 3 sessions × 1.5 kWh
  } else { // mixed: 60% LPG + 40% firewood
    r.cooking = (answers.lpgKgMonth * 0.6 / 30 / 5) * EF.lpg_per_kg
              + (answers.firewoodKgDay * 0.4 / 5) * EF.firewood_per_kg;
  }

  // 4. FOOD — 2 meals attributed to the student
  r.food = (EF[answers.foodType] ?? EF.dal_bhat_local) * 2;

  // 5. WASTE — 0.5 kg/person/day
  r.waste = 0.5 * (EF[answers.wasteDisposal] ?? EF.municipal_bin);

  // 6. WATER — student share = total / 5
  r.water = (answers.waterLitresDay / 5) * EF.water_per_litre;

  // 7. SCHOOL ELECTRICITY — shared across 40 students/class
  const schoolKwh = EF[`school_${answers.schoolElectricity}_kwh`] ?? EF.school_moderate_kwh;
  r.electricity_school = (schoolKwh * EF.nepal_grid_kwh) / 40;

  // 8. CARBON SINK — negative
  r.carbon_sink = -(answers.treesCount * EF.tree_per_day_kg);

  const gross = Object.entries(r)
    .filter(([k, v]) => k !=='carbon_sink'&& v > 0)
    .reduce((sum, [, v]) => sum + v, 0);
  const net = gross + r.carbon_sink;

  // ECO SCORE 0–100 (100 at net ≤1.0 kg, 0 at net ≥8.0 kg)
  const score = Math.max(0, Math.min(100,
    Math.round(100 - ((net - 1.0) / 7.0) * 100)
  ));

  return {
    breakdown: r,
    grossTotal: +gross.toFixed(3),
    netTotal:   +net.toFixed(3),
    ecoScore:   score,
    daily:   +net.toFixed(2),
    monthly: +(net * 30).toFixed(1),
    yearly:  +(net * 365).toFixed(0),
  };
}

/* ─── Category metadata (labels, colours, icons) ─────────────────────────*/
export const CATEGORY_META = {
  transport:          { label:'Transport',        color:'#f4a261', icon:'bus'},
  electricity_home:   { label:'Home Electricity',  color:'#52b788', icon:'bolt'},
  cooking:            { label:'Cooking Fuel',      color:'#e76f51', icon:'flame'},
  food:               { label:'Food',              color:'#95d5b2', icon:'bowl'},
  waste:              { label:'Waste',             color:'#6b4226', icon:'trash'},
  water:              { label:'Water',             color:'#90e0ef', icon:'droplet'},
  electricity_school: { label:'School Power',      color:'#2d6a4f', icon:'school'},
};

/* ─── Total impact message ───────────────────────────────────────────────*/
export function getTotalImpactMessage(netKgPerDay, lang = 'en') {
  const yearly = netKgPerDay * 365;
  const trees  = Math.max(1, Math.ceil(yearly / 21));
  const busKm  = Math.round(netKgPerDay / 0.089);
  const nrs    = Math.round(yearly * 18);
  const D = netKgPerDay.toFixed(1); const Y = yearly.toFixed(0); const N = nrs.toLocaleString();
  const ne = (netKgPerDay > 6) ? {
      tone:'high',
      headline:`आज तपाईंको फुटप्रिन्ट ${D} किलो CO₂ छ`,
      destruction:`यो दिनहुँ ${busKm} किलोमिटर कार चलाएजस्तै हो। एक वर्षमा ${Y} किलो CO₂ — तपाईंले निकालेको सोस्न मात्रै ${trees} रूख वर्षभरि हुर्किनुपर्छ।`,
      moneyWasted:`जलवायु लागत ≈ रु. ${N} प्रति वर्ष — नेपालले बाढी, खडेरी र हिमाल पग्लाइ रोक्न खर्च गर्ने पैसा।`,
    } : (netKgPerDay > 3.5) ? {
      tone:'medium',
      headline:`आज तपाईंको फुटप्रिन्ट ${D} किलो CO₂ — नेपाल औसतको नजिक`,
      destruction:`वर्षमा करिब ${Y} किलो CO₂। यसलाई सन्तुलन गर्न ${trees} रूख वर्षभरि हुर्किनुपर्छ। सन् २००० देखि नेपालले करिब ८% वन गुमायो।`,
      moneyWasted:`जलवायु लागत ≈ रु. ${N}/वर्ष — यति पैसाले करिब ${Math.max(1, Math.round(nrs / 1500))} महिनाको स्कुल सामग्री किन्न सकिन्थ्यो।`,
    } : {
      tone:'low',
      headline:`उत्तम! आज तपाईंको फुटप्रिन्ट केवल ${D} किलो CO₂ छ`,
      destruction:`पहिल्यै नेपाल औसतभन्दा कम! वर्षको ${Y} किलो सन्तुलन गर्न ${trees} रूख मात्र चाहिन्छ — सजिलै सम्भव।`,
      moneyWasted:`जलवायु लागत केवल ≈ रु. ${N}/वर्ष — यसै राख्नुहोस् र साथीलाई पनि सघाउनुहोस्!`,
    };
  if (lang === 'ne') return ne;
  if (netKgPerDay > 6) {
    return {
      tone:'high',
      headline:`Your footprint is ${D} kg CO₂ today`,
      destruction:`That is like driving a car ${busKm} km every single day. In one year you produce ${Y} kg CO₂ — you would need ${trees} trees growing for a full year just to absorb what you emit. That's ${trees} trees for you alone.`,
      moneyWasted:`Climate cost ≈ Rs. ${N} per year — money Nepal spends on flood recovery, drought relief and glacier-retreat mitigation.`,
    };
  } else if (netKgPerDay > 3.5) {
    return {
      tone:'medium',
      headline:`Your footprint is ${D} kg CO₂ today — near Nepal average`,
      destruction:`About ${Y} kg CO₂ per year. To offset this, ${trees} trees would need to grow for a full year. Nepal lost ~8% of forest cover since 2000 — those trees don't exist anymore.`,
      moneyWasted:`Climate cost ≈ Rs. ${N}/year — that could pay for about ${Math.max(1, Math.round(nrs / 1500))} months of school supplies instead.`,
    };
  }
  return {
    tone:'low',
    headline:`Great! Your footprint is only ${D} kg CO₂ today`,
    destruction:`Already below Nepal's average! Your ${Y} kg/year needs only ${trees} tree${trees > 1 ?'s':''} to offset — very manageable.`,
    moneyWasted:`Climate cost is just ≈ Rs. ${N}/year — keep it up and help friends do the same!`,
  };
}

/* ─── Per-category destruction messages ──────────────────────────────────*/
export const DESTRUCTION_MESSAGES = {
  transport: (kg) =>`This much travel emitted ${kg.toFixed(2)} kg CO₂ — enough to fill about ${Math.round(kg * 500)} balloons with greenhouse gas that lingers over 100 years.`,
  cooking:   (kg) =>`Cooking today released ${kg.toFixed(2)} kg CO₂. Firewood also throws black-carbon soot that darkens and melts Himalayan glaciers.`,
  waste:     (kg) =>`Handling waste this way released ${kg.toFixed(2)} kg CO₂. Open burning adds toxic dioxins — Bagmati's plastic load has tripled in 10 years.`,
  food:      (kg) =>`Today's meals cost ${kg.toFixed(2)} kg CO₂. Multiply that by a million students and you get a small power plant running every day.`,
  electricity_home: (kg) =>`Home electricity emitted ${kg.toFixed(2)} kg CO₂. In dry season Nepal imports thermal power from India — every saved kWh cuts coal across the border.`,
  water:     (kg) =>`Treating and pumping your water emitted ${kg.toFixed(2)} kg CO₂. Clean water is energy — and Nepal's water stress is rising.`,
  electricity_school: (kg) =>`Your share of school power emitted ${kg.toFixed(2)} kg CO₂. Shared savings (lights, projectors) scale fast across 40 classmates.`,
};

export const DESTRUCTION_MESSAGES_NE = {
  transport: (kg) =>`यो यात्राले ${kg.toFixed(2)} किलो CO₂ निकाल्यो — १०० वर्षभन्दा बढी टिक्ने हरितगृह ग्यासले करिब ${Math.round(kg * 500)} बेलुन भर्न पुग्ने।`,
  cooking:   (kg) =>`आजको खाना पकाइले ${kg.toFixed(2)} किलो CO₂ निकाल्यो। दाउराको कालो कार्बनले हिमाली हिमनदी कालो बनाई पगाल्छ।`,
  waste:     (kg) =>`यसरी फोहोर व्यवस्थापनले ${kg.toFixed(2)} किलो CO₂ निकाल्यो। खुला जलनले विषाक्त ग्यास थप्छ।`,
  food:      (kg) =>`आजको खानाले ${kg.toFixed(2)} किलो CO₂ लाग्यो। दस लाख विद्यार्थीले गुणन गर्दा दैनिक सानो पावर प्लान्ट बराबर हुन्छ।`,
  electricity_home: (kg) =>`घरको बिजुलीले ${kg.toFixed(2)} किलो CO₂ निकाल्यो। सुक्खायाममा नेपालले भारतबाट थर्मल बिजुली ल्याउँछ — बचेको हरेक युनिटले कोइला घटाउँछ।`,
  water:     (kg) =>`पानी प्रशोधन/पम्पले ${kg.toFixed(2)} किलो CO₂ निकाल्यो। सफा पानी पनि ऊर्जा हो।`,
  electricity_school: (kg) =>`स्कुल बिजुलीको तपाईंको हिस्साले ${kg.toFixed(2)} किलो CO₂ निकाल्यो। साझा बचत ४० सहपाठीमा छिटो बढ्छ।`,
};

/* ─── Reduction tips ─────────────────────────────────────────────────────*/
export const TIPS = [
  { category:'transport', condition:a=>a.transportMode==='private_car', co2SavedPerDay:0.384,
    tip:'Switch to the school bus or walk if you live within 2 km.',
    ne:{ tip:'स्कुल बस चढ्नुहोस् वा २ किमीभित्र भए हिँड्नुहोस्।', savingsMessage:{ plant:'७ दिन बिरुवा हुर्काउन पुग्ने CO₂ बचाउँछ!', money:'स्कुल यात्रामा परिवारलाई करिब रु. ३५०/महिना पेट्रोल बचत।', nature:'उपत्यकामा कम धुवाँ — सफा हिमाली आकाश।', fun:'२ किमी हिँड्दा ~१२० क्यालोरी — निःशुल्क व्यायाम!' } },
    savingsMessage:{ plant:'Saves enough CO₂ to grow a seedling for 7 days!', money:'Family saves ≈ Rs. 350/month in petrol on school trips.', nature:'Less exhaust over Kathmandu Valley means clearer mountain skies.', fun:'2 km of walking burns ~120 calories — a free daily workout!'} },
  { category:'transport', condition:a=>a.transportMode==='motorbike', co2SavedPerDay:0.136,
    tip:'Cycle or share the bus for short trips instead of the motorbike.',
    ne:{ tip:'छोटो यात्रामा मोटरसाइकलको साटो साइकल वा साझा बस चढ्नुहोस्।', savingsMessage:{ money:'हरेक हप्ता इन्धन बचत।', nature:'दुई-स्ट्रोक धुवाँ घटाउँदा सबैलाई फाइदा।', fun:'साइकलले काठमाडौंको जाममा छिटो!' } },
    savingsMessage:{ money:'Save fuel money every week.', nature:'Two-stroke smoke is a big valley pollutant — cutting it helps everyone.', fun:'Cycling beats traffic jams on Kathmandu streets!'} },
  { category:'waste', condition:a=>a.wasteDisposal==='open_burning', co2SavedPerDay:1.02,
    tip:'Compost food waste and hand plastic to a recycler instead of burning.',
    ne:{ tip:'फोहोर जलाउनुको साटो कम्पोस्ट गर्नुहोस् र प्लास्टिक रिसाइकलरलाई दिनुहोस्।', savingsMessage:{ plant:'एक महिना गर्दा एउटा रूख वर्षभरि हुर्काएबराबर!', money:'स्क्र्याप प्लास्टिकले रु. १०–२५/किलो आम्दानी।', water:'बागमतीमा खरानी पुग्दैन — तल सफा पानी।', fun:'राम्रो बानीले कक्षालाई गर्व!' } },
    savingsMessage:{ plant:'A month of this grows a young tree for a full year!', money:'Scrap plastic earns Rs. 10–25/kg at Kathmandu dealers.', water:'No ash reaching Bagmati — cleaner water downstream.', fun:'Forest Arena gives your class +15 points for this!'} },
  { category:'waste', condition:a=>a.wasteDisposal==='open_dump', co2SavedPerDay:0.32,
    tip:'Use the municipal bin or compost rather than dumping in open land.',
    ne:{ tip:'खुला जग्गामा नफाली नगर डस्टबिन वा कम्पोस्ट प्रयोग गर्नुहोस्।', savingsMessage:{ plant:'जैविक कम्पोस्टले उत्सर्जन ~९०% घटाउँछ।', water:'खोलामा लिचेट पुग्न रोक्छ।', nature:'माटोका सूक्ष्मजीव जोगाउँछ।' } },
    savingsMessage:{ plant:'Composting organic waste cuts emissions ~90%.', water:'Stops leachate seeping into local streams.', nature:'Protects soil microbes that keep farmland fertile.'} },
  { category:'cooking', condition:a=>a.cookingFuel==='firewood'||a.cookingFuel==='mixed', co2SavedPerDay:0.28,
    tip:'Ask family about a pressure cooker — it cuts firewood use ~40%.',
    ne:{ tip:'परिवारलाई प्रेसर कुकरबारे सुझाव दिनुहोस् — दाउरा ~४०% घट्छ।', savingsMessage:{ plant:'वर्षको ~०.५ रूख बचत — स्थानीय वन जोगाउनुहोस्।', money:'दाउरामा करिब रु. १,२००/वर्ष बचत।', nature:'कम कालो कार्बन — जिल्लाको हिमाल जोगिन्छ।', fun:'खाना ३ गुणा छिटो — खेल्ने समय बढी!' } },
    savingsMessage:{ plant:'Saves ~0.5 trees/year — protect your local forest.', money:'Saves ≈ Rs. 1,200/year in firewood.', nature:'Less soot means less glacier darkening in your district.', fun:'Food cooks 3× faster — more time to play!'} },
  { category:'electricity', condition:a=>a.electricityHours>8, co2SavedPerDay:0.237,
    tip:'Turn off lights and fans when leaving a room — even for 5 minutes.',
    ne:{ tip:'कोठा छोड्दा बत्ती र पंखा निभाउनुहोस् — ५ मिनेटका लागि पनि।', savingsMessage:{ plant:'दैनिक १ घण्टा बचत = वर्षको ८६ किलो CO₂ = ४ रूख!', money:'NEA रु. १३/युनिटमा ~रु. १,४२०/वर्ष बचत।', nature:'कम ग्रिड भार = सुक्खायाममा कम थर्मल आयात।', fun:'लोडसेडिङ समयमा बाहिर खेल्नुहोस्!' } },
    savingsMessage:{ plant:'1 hour/day saved = 86 kg CO₂/year = 4 trees of absorption!', money:'Saves ≈ Rs. 1,420/year at NEA Rs. 13/kWh.', nature:'Less grid load = less thermal import in dry season.', fun:'Use load-shedding time for outdoor play!'} },
  { category:'electricity', condition:a=>!a.hasSolar&&a.electricityHours>5, co2SavedPerDay:0.0,
    tip:'Even a small solar panel can charge phones and lights nearly carbon-free (0.04 kg/kWh).',
    ne:{ tip:'सानो सौर्य प्यानलले फोन र बत्ती झन्डै कार्बनमुक्त चार्ज गर्छ (०.०४ किलो/युनिट)।', savingsMessage:{ plant:'सौर्य बिजुली ग्रिडभन्दा ~२० गुणा सफा।', money:'फिर्तापछि मासिक NEA बिल घट्छ।', nature:'नेपाललाई पूर्ण-जलविद्युत आदर्शनेर राख्छ।' } },
    savingsMessage:{ plant:'Solar electricity is ~20× cleaner than the grid.', money:'Cuts monthly NEA bills after payback.', nature:'Helps Nepal stay closer to its all-hydro ideal.'} },
  { category:'food', condition:a=>a.foodType==='packaged_food'||a.foodType==='meat_heavy', co2SavedPerDay:1.70,
    tip:'Bring home-cooked dal bhat or veg tiffin to school.',
    ne:{ tip:'स्कुलमा घरको दालभात वा सागसब्जी टिफिन ल्याउनुहोस्।', savingsMessage:{ plant:'वर्षभरि स्थानीय दालभातले ६२१ किलो CO₂ = ३० रूख बचत!', money:'टिफिन रु. ३०–५० बनाम प्याकेज रु. १५०–२००। वर्षको रु. ३,०००!', nature:'स्थानीय खानाले आयात उत्सर्जन घटाउँछ।', fun:'आमाको खाना सधैं मीठो!' } },
    savingsMessage:{ plant:'One year of local dal bhat saves 621 kg CO₂ = 30 trees!', money:'Tiffin Rs. 30–50 vs Rs. 150–200 packaged. Save Rs. 3,000/year!', nature:'Local food keeps rupees in Nepal and cuts import emissions.', fun:'Ama ko khana is always better anyway!'} },
  { category:'water', condition:a=>a.waterLitresDay>200, co2SavedPerDay:0.009,
    tip:'Fix dripping taps and reuse rinse water for the garden.',
    ne:{ tip:'चुहिने धारा मर्मत गर्नुहोस् र पखालेको पानी बगैंचामा प्रयोग गर्नुहोस्।', savingsMessage:{ water:'दैनिक ५० लि. बचतले पम्पिङ/प्रशोधन ऊर्जा बचाउँछ।', money:'परिवारको पानी बिल घट्छ।', nature:'नेपालको पानी संकट सहज बनाउँछ।' } },
    savingsMessage:{ water:'Saving 50 L/day spares pumping and treatment energy.', money:'Lower water bills for your family.', nature:"Eases Nepal's growing water stress."} },
  { category:'water', condition:a=>!a.harvestRain, co2SavedPerDay:0.0,
    tip:'Harvest rainwater for the garden and washing — free during monsoon.',
    ne:{ tip:'बगैंचा र धुलाइका लागि वर्षाको पानी संकलन गर्नुहोस् — मनसुनमा निःशुल्क।', savingsMessage:{ water:'पम्प/प्रशोधित आपूर्तिको माग घटाउँछ।', money:'वर्षको केही महिना निःशुल्क पानी।', nature:'भूमिगत जल पुनर्भरण गर्छ।' } },
    savingsMessage:{ water:'Cuts demand on pumped, treated supply.', money:'Free water for months of the year.', nature:'Recharges local groundwater too.'} },
  { category:'school', condition:a=>a.schoolElectricity==='heavy', co2SavedPerDay:0.05,
    tip:'Suggest an"off when empty"rule for the lab and AC at school.',
    ne:{ tip:'स्कुलको ल्याब र एसीमा "खाली भए निभाउने" नियम सुझाउनुहोस्।', savingsMessage:{ plant:'४० विद्यार्थीको साझा बचत छिटो बढ्छ।', money:'कम बिलले किताबका लागि पैसा बचाउँछ।', nature:'NEA ग्रिडमा दबाब घटाउँछ।' } },
    savingsMessage:{ plant:'Shared savings across 40 students add up fast.', money:'Lower school bills free money for books.', nature:'Eases pressure on the NEA grid.'} },
  { category:'trees', condition:a=>a.treesCount<5, co2SavedPerDay:0.0575,
    tip:'Plant and care for one native tree this season (oak, utis, or rhododendron).',
    ne:{ tip:'यो सिजन एउटा स्वदेशी रूख (फलाँट, उत्तिस वा गुराँस) रोपी हेरचाह गर्नुहोस्।', savingsMessage:{ plant:'प्रत्येक जीवित रूखले वर्षको ~२१ किलो CO₂ सोस्छ।', nature:'स्वदेशी रूखले चरा र रातो पाण्डाको जंगल पाल्छ।', fun:'वास्तविक रोपाइँले इनाम दिन्छ!' } },
    savingsMessage:{ plant:'Each living tree absorbs ~21 kg CO₂/year.', nature:"Native trees feed Nepal's birds and the red panda's forest.", fun:'Forest Arena rewards real planting!'} },
];

export function getTipsForAnswers(answers, max = 5, lang = 'en') {
  const sel = TIPS.filter(t => { try { return t.condition(answers); } catch { return false; } }).slice(0, max);
  return sel.map(({ ne, ...rest }) => (lang === 'ne' && ne ? { ...rest, tip: ne.tip, savingsMessage: ne.savingsMessage } : rest));
}

/* ─── Comparison benchmarks (kg CO2e/day) ────────────────────────────────*/
export const BENCHMARKS = { you: null, nepalAvg: 4.5, globalAvg: 13.7 };

/* ============================================================================
 * EXPLORER GAME — 5 levels of decision events
 * Each event: prompt, choices[{label, correct, co2Impact(kg), effect}], explain
 * ==========================================================================*/
/* Fair cooking comparison: same daily useful cooking energy across fuels, so the
   "best" badge reflects reality (induction/biogas clean, LPG & firewood high) instead
   of being an artefact of how much fuel the slider happens to be set to. */
export const COOK_USEFUL_KWH = 0.6; // student-share useful cooking energy per day
const COOK_USEFUL_PER_KG = { lpg: 7.48, firewood: 0.645 }; // useful kWh delivered per kg
export function cookingCompareDaily(fuel) {
  const lpg  = (COOK_USEFUL_KWH / COOK_USEFUL_PER_KG.lpg)      * EF.lpg_per_kg;
  const wood = (COOK_USEFUL_KWH / COOK_USEFUL_PER_KG.firewood) * EF.firewood_per_kg;
  const elec = (COOK_USEFUL_KWH / 0.85)                        * EF.induction_per_kwh; // induction ~85% eff, clean hydro
  if (fuel === 'lpg') return lpg;
  if (fuel === 'firewood') return wood;
  if (fuel === 'electric') return elec;
  return 0.6 * lpg + 0.4 * wood; // mixed
}

export const EXPLORER_LEVELS = [
  { id:1, name:"Baglung Village", name_ne:"बागलुङ गाउँ", theme:{ ground:0xb9985a, sky:0x90e0ef, accent:0x6b8e23 },
    blurb:"Mountain village — firewood, footpaths and forest.", blurb_ne:"पहाडी गाउँ — दाउरा, गोरेटो र जंगल।",
    events:[
      { prompt:"In your Baglung hill home, it is time to cook dinner. Which fuel?", prompt_ne:"बागलुङको पहाडी घरमा बेलुकाको खाना पकाउने बेला। कुन इन्धन?", landmark:"house", spot:"Baglung home", spot_ne:"बागलुङ घर",
        explainRight:"Biogas (or an improved cookstove) avoids open-fire smoke and ~1.75 kg CO₂ per kg of firewood, sparing the forest.", explainRight_ne:"बायोग्यास (वा सुधारिएको चुलो)ले खुला आगोको धुवाँ र प्रति किलो दाउरा ~१.७५ किलो CO₂ बचाउँछ, जंगल जोगाउँछ।",
        choices:[ {label:"Open firewood fire", label_ne:"खुला दाउरा आगो", correct:false, co2Impact:1.747, effect:"smog_on"}, {label:"Biogas stove", label_ne:"बायोग्यास चुलो", correct:true, co2Impact:1.747, effect:"leaves_grow"} ] },
      { prompt:"School in Baglung Bazaar is 2 km along the hill trail. How do you go?", prompt_ne:"बागलुङ बजारको स्कुल गोरेटो बाटो हुँदै २ किमि टाढा छ। कसरी जाने?", landmark:"signpost", spot:"Trail to Bazaar", spot_ne:"बजार जाने बाटो",
        explainRight:"Walking emits 0 kg; a motorbike lift would add ~0.27 kg.", explainRight_ne:"हिँड्दा ० किलो; मोटरसाइकलले ~०.२७ किलो थप्छ।",
        choices:[ {label:"Motorbike lift", label_ne:"मोटरसाइकल", correct:false, co2Impact:0.27, effect:"sky_hazy"}, {label:"Walk", label_ne:"हिँड्ने", correct:true, co2Impact:0.27, effect:"sky_clear"} ] },
      { prompt:"Dry leaves pile up in your Galkot yard. What now?", prompt_ne:"गल्कोटको आँगनमा सुकेका पात थुप्रिए। अब के गर्ने?", landmark:"leafpile", spot:"Galkot yard", spot_ne:"गल्कोट आँगन",
        explainRight:"Composting avoids ~2.04 kg CO₂/kg vs open burning and feeds the soil.", explainRight_ne:"कम्पोस्ट बनाउँदा खुला जलाउने भन्दा ~२.०४ किलो CO₂/किलो बचत हुन्छ र माटो मलिलो बनाउँछ।",
        choices:[ {label:"Burn them", label_ne:"जलाउने", correct:false, co2Impact:2.04, effect:"smog_on"}, {label:"Compost", label_ne:"कम्पोस्ट गर्ने", correct:true, co2Impact:2.04, effect:"add_tree"} ] },
      { prompt:"Planting day at your Baglung school. Which seedling?", prompt_ne:"बागलुङ स्कुलमा वृक्षारोपण दिवस। कुन बिरुवा?", landmark:"school", spot:"Baglung school", spot_ne:"बागलुङ स्कुल",
        explainRight:"Native oak stores more carbon and supports local biodiversity.", explainRight_ne:"रैथाने खर्सुले बढी कार्बन भण्डारण गर्छ र स्थानीय जैविक विविधता बढाउँछ।",
        choices:[ {label:"Native oak", label_ne:"रैथाने खर्सु", correct:true, co2Impact:0.5, effect:"add_tree"}, {label:"Ornamental flower", label_ne:"सजावटी फूल", correct:false, co2Impact:0.5, effect:"leaves_wither"} ] },
      { prompt:"At the Baglung Bazaar shop, the shopkeeper offers a plastic bag.", prompt_ne:"बागलुङ बजारको पसलेले प्लास्टिकको झोला दिन्छन्।", landmark:"shop", spot:"Bazaar shop", spot_ne:"बजार पसल",
        explainRight:"A cloth bag prevents future burning of plastic (2.1 kg CO₂/kg).", explainRight_ne:"कपडाको झोलाले भविष्यमा प्लास्टिक जलाउनबाट (२.१ किलो CO₂/किलो) जोगाउँछ।",
        choices:[ {label:"Cloth bag", label_ne:"कपडाको झोला", correct:true, co2Impact:0.3, effect:"leaves_grow"}, {label:"Plastic bag", label_ne:"प्लास्टिक झोला", correct:false, co2Impact:0.3, effect:"leaves_wither"} ] },
    ] },
  { id:2, name:"Chitwan Farmland", name_ne:"चितवन खेतीयोग्य भूमि", theme:{ ground:0x7cb342, sky:0x90e0ef, accent:0x33691e },
    blurb:"Terai rice fields — water, soil and stubble.", blurb_ne:"तराईको धानखेत — पानी, माटो र पराल।",
    events:[
      { prompt:"Your paddy near Sauraha needs water. How?", prompt_ne:"सौराहा नजिकको धानखेतलाई पानी चाहियो। कसरी?", landmark:"paddy", spot:"Sauraha paddy", spot_ne:"सौराहा धानखेत",
        explainRight:"Alternate wet-dry irrigation cuts paddy methane by ~30%.", explainRight_ne:"पालैपालो भिजाउने–सुकाउने (AWD) सिँचाइले धानको मिथेन ~३०% घटाउँछ।",
        choices:[ {label:"Flood continuously", label_ne:"लगातार जलमग्न", correct:false, co2Impact:1.0, effect:"river_dirty"}, {label:"Alternate wet-dry", label_ne:"पालैपालो भिजाउने–सुकाउने", correct:true, co2Impact:1.0, effect:"river_clean"} ] },
      { prompt:"Your Bharatpur field needs nutrients before planting.", prompt_ne:"रोप्नुअघि भरतपुरको खेतलाई पोषक तत्व चाहियो।", landmark:"compost", spot:"Bharatpur field", spot_ne:"भरतपुर खेत",
        explainRight:"Farmyard manure and biogas bio-slurry cut the need for high-emission chemical fertiliser and rebuild soil health — what Nepali farms actually use at field scale.", explainRight_ne:"गोठेमल र बायोग्यास स्लरीले उच्च-उत्सर्जन रासायनिक मलको आवश्यकता घटाउँछ र माटोको स्वास्थ्य सुधार्छ — नेपाली खेतमा वास्तवमै प्रयोग हुने तरिका।",
        choices:[ {label:"Chemical fertiliser (urea)", label_ne:"रासायनिक मल (युरिया)", correct:false, co2Impact:0.6, effect:"leaves_wither"}, {label:"Farmyard manure / bio-slurry", label_ne:"गोठेमल / बायोस्लरी", correct:true, co2Impact:0.6, effect:"leaves_grow"} ] },
      { prompt:"Crossing the field by the Rapti river — walk or ride?", prompt_ne:"राप्ती किनारको खेत पार गर्ने — हिँड्ने कि चढ्ने?", landmark:"tractor", spot:"Rapti field", spot_ne:"राप्ती खेत",
        explainRight:"Walking the path avoids needless tractor diesel.", explainRight_ne:"गोरेटोबाट हिँड्दा ट्र्याक्टरको अनावश्यक डिजेल बच्छ।",
        choices:[ {label:"Tractor shortcut", label_ne:"ट्र्याक्टर सर्टकट", correct:false, co2Impact:0.4, effect:"smog_on"}, {label:"Walk the path", label_ne:"गोरेटोबाट हिँड्ने", correct:true, co2Impact:0.4, effect:"sky_clear"} ] },
      { prompt:"Rice stubble is left in the Terai field after harvest.", prompt_ne:"बाली काटेपछि तराईको खेतमा पराल बाँकी छ।", landmark:"stubble", spot:"Terai stubble", spot_ne:"तराई पराल",
        explainRight:"Tilling stubble back stores soil carbon; burning releases it + smog.", explainRight_ne:"पराललाई माटोमा जोत्दा माटोको कार्बन बढ्छ; जलाउँदा त्यो निस्कन्छ र धुवाँ हुन्छ।",
        choices:[ {label:"Burn stubble", label_ne:"पराल जलाउने", correct:false, co2Impact:1.2, effect:"smog_on"}, {label:"Till into soil", label_ne:"माटोमा जोत्ने", correct:true, co2Impact:1.2, effect:"leaves_grow"} ] },
      { prompt:"The irrigation pump by the Narayani needs power.", prompt_ne:"नारायणी किनारको सिँचाइ पम्पलाई शक्ति चाहियो।", landmark:"pump", spot:"Narayani pump", spot_ne:"नारायणी पम्प",
        explainRight:"A solar pump avoids ~2.68 kg CO₂ per litre of diesel.", explainRight_ne:"सोलार पम्पले प्रति लिटर डिजेलमा ~२.६८ किलो CO₂ बचाउँछ।",
        choices:[ {label:"Diesel pump", label_ne:"डिजेल पम्प", correct:false, co2Impact:2.68, effect:"sky_hazy"}, {label:"Solar pump", label_ne:"सोलार पम्प", correct:true, co2Impact:2.68, effect:"sky_clear"} ] },
    ] },
  { id:3, name:"Kathmandu City", name_ne:"काठमाडौँ सहर", theme:{ ground:0x9e9e9e, sky:0xcbb994, accent:0x607d8b },
    blurb:"Dense, smoggy, fast — the choices add up.", blurb_ne:"घना, धुवाँमय, छिटो — छनोटहरू थुप्रिन्छन्।",
    events:[
      { prompt:"Getting to school across Kathmandu? A Sajha bus or...?", prompt_ne:"काठमाडौँभरि स्कुल जाने? साझा बस कि...?", landmark:"busstop", spot:"Ratnapark stop", spot_ne:"रत्नपार्क स्टप",
        explainRight:"The bus shares emissions across many riders; a private car is ~2× per km.", explainRight_ne:"बसले धेरै यात्रुमा उत्सर्जन बाँड्छ; निजी कार प्रति किमि ~२ गुणा।",
        choices:[ {label:"Parent drives", label_ne:"अभिभावकले गाडी चलाउने", correct:false, co2Impact:0.8, effect:"smog_on"}, {label:"School bus", label_ne:"स्कुल बस", correct:true, co2Impact:0.8, effect:"sky_clear"} ] },
      { prompt:"Lunch at the New Road canteen today?", prompt_ne:"आज न्युरोडको क्यान्टिनमा खाजा?", landmark:"shop", spot:"New Road canteen", spot_ne:"न्युरोड क्यान्टिन",
        explainRight:"Dal bhat saves ~1.70 kg CO₂ vs packaged chips.", explainRight_ne:"दालभातले प्याकेज चिप्सभन्दा ~१.७० किलो CO₂ बचाउँछ।",
        choices:[ {label:"Chips & noodles", label_ne:"चिप्स र चाउचाउ", correct:false, co2Impact:1.7, effect:"leaves_wither"}, {label:"Dal bhat", label_ne:"दालभात", correct:true, co2Impact:1.7, effect:"leaves_grow"} ] },
      { prompt:"A projector is left on in your Kathmandu classroom at lunch.", prompt_ne:"खाजाको समयमा काठमाडौँको कक्षाको प्रोजेक्टर बलिरहेको छ।", landmark:"school", spot:"City school", spot_ne:"सहरको स्कुल",
        explainRight:"Switching it off saves ~0.3 kWh = ~0.24 kg CO₂.", explainRight_ne:"बन्द गर्दा ~०.३ kWh = ~०.२४ किलो CO₂ बच्छ।",
        choices:[ {label:"Leave it on", label_ne:"बलिरहन दिने", correct:false, co2Impact:0.24, effect:"sky_hazy"}, {label:"Turn it off", label_ne:"बन्द गर्ने", correct:true, co2Impact:0.24, effect:"sky_clear"} ] },
      { prompt:"Your classroom waste bin near the Bagmati. How to sort it?", prompt_ne:"बागमती नजिकको कक्षाको फोहोर। कसरी छुट्याउने?", landmark:"dustbin", spot:"Bagmati bin", spot_ne:"बागमती बिन",
        explainRight:"Segregating organics and plastic avoids landfill methane and burning.", explainRight_ne:"जैविक र प्लास्टिक छुट्याउँदा ल्यान्डफिल मिथेन र जलाउने बच्छ।",
        choices:[ {label:"Mix everything", label_ne:"सबै मिसाउने", correct:false, co2Impact:0.5, effect:"river_dirty"}, {label:"Segregate", label_ne:"छुट्याउने", correct:true, co2Impact:0.5, effect:"river_clean"} ] },
      { prompt:"Thirsty at school in Thamel. What do you drink from?", prompt_ne:"थमेलमा स्कुलमा तिर्खा लाग्यो। केबाट पिउने?", landmark:"waterstation", spot:"Thamel tap", spot_ne:"थमेल धारा",
        explainRight:"A refillable steel bottle prevents 2.1 kg CO₂/kg of burned plastic.", explainRight_ne:"पुन: भर्ने स्टिल बोतलले २.१ किलो CO₂/किलो प्लास्टिक जलाउनबाट जोगाउँछ।",
        choices:[ {label:"New plastic bottle", label_ne:"नयाँ प्लास्टिक बोतल", correct:false, co2Impact:0.4, effect:"leaves_wither"}, {label:"Refill steel bottle", label_ne:"स्टिल बोतल भर्ने", correct:true, co2Impact:0.4, effect:"leaves_grow"} ] },
      { prompt:"Your school roof in Kalanki is bare. What goes on it?", prompt_ne:"कलंकीको स्कुल छत खाली छ। त्यहाँ के राख्ने?", landmark:"building", spot:"Kalanki roof", spot_ne:"कलंकी छत",
        explainRight:"Rooftop solar (0.04 kg/kWh) displaces dirty grid power.", explainRight_ne:"छतको सोलार (०.०४ किलो/kWh)ले फोहोर ग्रिड बिजुली विस्थापित गर्छ।",
        choices:[ {label:"Leave it bare", label_ne:"खाली छोड्ने", correct:false, co2Impact:1.0, effect:"sky_hazy"}, {label:"Install solar", label_ne:"सोलार जडान", correct:true, co2Impact:1.0, effect:"add_tree"} ] },
    ] },
  { id:4, name:"Kali Gandaki Valley", name_ne:"कालीगण्डकी उपत्यका", theme:{ ground:0x8d8378, sky:0x80c8e0, accent:0x4e6e58 },
    blurb:"River canyon under construction — protect the water.", blurb_ne:"निर्माणाधीन नदी घाटी — पानी जोगाऔं।",
    events:[
      { prompt:"New power for the Beni district. Which source?", prompt_ne:"बेनी जिल्लाका लागि नयाँ बिजुली। कुन स्रोत?", landmark:"powerplant", spot:"Beni power", spot_ne:"बेनी बिजुली",
        explainRight:"Run-of-river hydro is clean; a coal plant would be the dirtiest option.", explainRight_ne:"रन-अफ-रिभर जलविद्युत् सफा छ; कोइला प्लान्ट सबैभन्दा फोहोर हुन्छ।",
        choices:[ {label:"Coal plant", label_ne:"कोइला प्लान्ट", correct:false, co2Impact:2.0, effect:"smog_on"}, {label:"Run-of-river hydro", label_ne:"रन-अफ-रिभर जलविद्युत्", correct:true, co2Impact:2.0, effect:"sky_clear"} ] },
      { prompt:"Road widening near the Kaligandaki gorge riverbank trees.", prompt_ne:"कालीगण्डकी गल्छीको किनारका रूख नजिक सडक विस्तार।", landmark:"riverbank", spot:"Gorge riverbank", spot_ne:"गल्छी किनार",
        explainRight:"Keeping the trees stores carbon and prevents erosion.", explainRight_ne:"रूख जोगाउँदा कार्बन भण्डारण हुन्छ र भूक्षय रोकिन्छ।",
        choices:[ {label:"Clear them", label_ne:"काट्ने", correct:false, co2Impact:1.5, effect:"leaves_wither"}, {label:"Protect them", label_ne:"जोगाउने", correct:true, co2Impact:1.5, effect:"add_tree"} ] },
      { prompt:"Where does the Jomsom road construction waste go?", prompt_ne:"जोमसोम सडक निर्माणको फोहोर कहाँ जान्छ?", landmark:"construction", spot:"Jomsom site", spot_ne:"जोमसोम साइट",
        explainRight:"A proper site stops debris choking the river.", explainRight_ne:"उचित साइटले नदीमा फोहोर जानबाट रोक्छ।",
        choices:[ {label:"Into the river", label_ne:"नदीमा", correct:false, co2Impact:0.9, effect:"river_dirty"}, {label:"Proper site", label_ne:"उचित साइट", correct:true, co2Impact:0.9, effect:"river_clean"} ] },
      { prompt:"Sanitation for the Tatopani road workers?", prompt_ne:"तातोपानी सडक मजदुरका लागि सरसफाइ?", landmark:"toilet", spot:"Tatopani camp", spot_ne:"तातोपानी क्याम्प",
        explainRight:"A bio-toilet protects water quality and captures methane.", explainRight_ne:"बायो-शौचालयले पानीको गुणस्तर जोगाउँछ र मिथेन समात्छ।",
        choices:[ {label:"Open defecation", label_ne:"खुला दिसा", correct:false, co2Impact:0.5, effect:"river_dirty"}, {label:"Bio-toilet", label_ne:"बायो-शौचालय", correct:true, co2Impact:0.5, effect:"river_clean"} ] },
      { prompt:"Building a lodge near Kagbeni — material choice?", prompt_ne:"कागबेनी नजिक लज बनाउने — सामग्री छनोट?", landmark:"stones", spot:"Kagbeni build", spot_ne:"कागबेनी निर्माण",
        explainRight:"Local stone avoids cement (~0.81 kg CO₂/kg).", explainRight_ne:"स्थानीय ढुङ्गाले सिमेन्ट (~०.८१ किलो CO₂/किलो) बचाउँछ।",
        choices:[ {label:"Cement-heavy", label_ne:"सिमेन्टप्रधान", correct:false, co2Impact:0.81, effect:"sky_hazy"}, {label:"Local stone", label_ne:"स्थानीय ढुङ्गा", correct:true, co2Impact:0.81, effect:"leaves_grow"} ] },
    ] },
  { id:5, name:"Himalayan Trail", name_ne:"हिमाली बाटो", theme:{ ground:0xeaf2f6, sky:0xbfe6f2, accent:0x2f6f4f },
    blurb:"Ice, thinning forest and a fragile glacial lake.", blurb_ne:"हिउँ, पातलिँदो जंगल र नाजुक हिमताल।",
    events:[
      { prompt:"Light for the night camp above Namche?", prompt_ne:"नाम्चेमाथि रातको क्याम्पका लागि उज्यालो?", landmark:"tent", spot:"Namche camp", spot_ne:"नाम्चे क्याम्प",
        explainRight:"A solar lantern avoids kerosene soot on the snow.", explainRight_ne:"सोलार लालटिनले हिउँमा मट्टितेलको कालो धुवाँ रोक्छ।",
        choices:[ {label:"Kerosene lantern", label_ne:"मट्टितेल लालटिन", correct:false, co2Impact:0.6, effect:"smog_on"}, {label:"Solar lantern", label_ne:"सोलार लालटिन", correct:true, co2Impact:0.6, effect:"sky_clear"} ] },
      { prompt:"Drinking water on the Everest trail?", prompt_ne:"सगरमाथा बाटोमा खानेपानी?", landmark:"waterstation", spot:"Khumbu trail", spot_ne:"खुम्बु बाटो",
        explainRight:"A community refill station ends single-use plastic up here.", explainRight_ne:"सामुदायिक रिफिल स्टेशनले यहाँको एकपटके प्लास्टिक हटाउँछ।",
        choices:[ {label:"Single-use bottle", label_ne:"एकपटके बोतल", correct:false, co2Impact:0.4, effect:"leaves_wither"}, {label:"Refill station", label_ne:"रिफिल स्टेशन", correct:true, co2Impact:0.4, effect:"leaves_grow"} ] },
      { prompt:"Where to camp near Imja Tsho glacial lake?", prompt_ne:"इम्जा छो हिमताल नजिक कहाँ क्याम्प?", landmark:"glaciallake", spot:"Imja Tsho", spot_ne:"इम्जा छो",
        explainRight:"Designated sites avoid GLOF risk: Nepal has had 26 glacial-lake outburst floods; Dig Tsho (1985) wrecked the Namche hydro plant.", explainRight_ne:"तोकिएको स्थानले GLOF जोखिम घटाउँछ: नेपालमा २६ हिमताल विस्फोट भइसके; डिग छो (१९८५)ले नाम्चे जलविद्युत् नष्ट गर्‍यो।",
        choices:[ {label:"Beside the glacial lake", label_ne:"हिमताल छेउमा", correct:false, co2Impact:0.3, effect:"river_dirty"}, {label:"Designated site", label_ne:"तोकिएको स्थान", correct:true, co2Impact:0.3, effect:"river_clean"} ] },
      { prompt:"Reforesting the slope above Lukla?", prompt_ne:"लुक्लामाथिको भिरमा वृक्षारोपण?", landmark:"nursery", spot:"Lukla slope", spot_ne:"लुक्ला भिर",
        explainRight:"Native mixed forest is resilient; monoculture pine is fragile.", explainRight_ne:"रैथाने मिश्रित जंगल बलियो हुन्छ; एकल सल्ला नाजुक हुन्छ।",
        choices:[ {label:"Monoculture pine", label_ne:"एकल सल्ला", correct:false, co2Impact:0.8, effect:"leaves_wither"}, {label:"Native mixed", label_ne:"रैथाने मिश्रित", correct:true, co2Impact:0.8, effect:"add_tree"} ] },
      { prompt:"An illegal timber truck passes near the Sagarmatha park gate.", prompt_ne:"सगरमाथा निकुञ्ज गेट नजिक अवैध काठको ट्रक।", landmark:"timbertruck", spot:"Park gate", spot_ne:"निकुञ्ज गेट",
        explainRight:"Reporting to the forest office upholds the Nepal Forest Act.", explainRight_ne:"वन कार्यालयलाई जानकारी दिँदा नेपालको वन ऐन पालना हुन्छ।",
        choices:[ {label:"Ignore it", label_ne:"बेवास्ता गर्ने", correct:false, co2Impact:2.5, effect:"leaves_wither"}, {label:"Report it", label_ne:"जानकारी दिने", correct:true, co2Impact:2.5, effect:"add_tree"} ] },
    ] },
  { id:6, name:"Dhulikhel", name_ne:"धुलिखेल", theme:{ ground:0x8fae54, sky:0x9fd6ec, accent:0x4e7d4a },
    blurb:"Hill station — terraces, pine forest and a Himalayan sunrise.", blurb_ne:"पहाडी स्टेसन — तेर्सो खेत, सल्लाको वन र हिमाली सूर्योदय।",
    events:[
      { prompt:"At your Dhulikhel homestay, cook the guests' dal bhat on…", prompt_ne:"धुलिखेलको होमस्टेमा पाहुनाको दालभात कुन चुलोमा पकाउने?", landmark:"house", spot:"Homestay kitchen", spot_ne:"होमस्टे भान्सा",
        explainRight:"Electric induction on Nepal's hydro grid is far cleaner than firewood (~1.75 kg CO₂/kg) and spares the hillside forest.", explainRight_ne:"नेपालको जलविद्युत्‌मा इन्डक्सन दाउरा (~१.७५ किलो CO₂/किलो) भन्दा निकै सफा छ र पहाडको वन जोगाउँछ।",
        choices:[ {label:"Open firewood fire", label_ne:"खुला दाउरा आगो", correct:false, co2Impact:1.747, effect:"smog_on"}, {label:"Electric induction", label_ne:"बिजुली इन्डक्सन", correct:true, co2Impact:1.747, effect:"leaves_grow"} ] },
      { prompt:"The sunrise viewpoint is 1.5 km up the ridge. Go by…", prompt_ne:"सूर्योदय भ्यूप्वाइन्ट डाँडामाथि १.५ किमि छ। कसरी जाने?", landmark:"signpost", spot:"Ridge trail", spot_ne:"डाँडाको बाटो",
        explainRight:"Walking emits 0 kg; a jeep up the ridge would add ~0.29 kg and dust.", explainRight_ne:"हिँड्दा ० किलो; जिपले ~०.२९ किलो र धुलो थप्छ।",
        choices:[ {label:"Jeep ride up", label_ne:"जिप चढ्ने", correct:false, co2Impact:0.29, effect:"sky_hazy"}, {label:"Walk up", label_ne:"हिँडेर जाने", correct:true, co2Impact:0.29, effect:"sky_clear"} ] },
      { prompt:"The steep slope below your house is bare after the monsoon. To hold the soil…", prompt_ne:"मनसुनपछि घरमुनिको भिरालो जमिन नाङ्गो छ। माटो थाम्न…", landmark:"terrace", spot:"Bare hillside", spot_ne:"नाङ्गो भिर",
        explainRight:"Terracing and tree roots hold the slope, prevent landslides, and store carbon.", explainRight_ne:"तेर्सो खेत र रूखका जराले भिर थाम्छ, पहिरो रोक्छ र कार्बन भण्डारण गर्छ।",
        choices:[ {label:"Leave it bare", label_ne:"नाङ्गै छोड्ने", correct:false, co2Impact:1.5, effect:"leaves_wither"}, {label:"Terrace & plant trees", label_ne:"तेर्सो बनाई रूख रोप्ने", correct:true, co2Impact:1.5, effect:"add_tree"} ] },
      { prompt:"Thirsty after the climb — drink from…", prompt_ne:"उकालोपछि तिर्खा लाग्यो — केबाट पिउने?", landmark:"waterstation", spot:"Spring tap", spot_ne:"मूलको धारा",
        explainRight:"A refillable steel bottle avoids ~2.1 kg CO₂/kg of plastic that often gets burned.", explainRight_ne:"पुन: भर्ने स्टिल बोतलले प्रायः जलाइने प्लास्टिक (~२.१ किलो CO₂/किलो) जोगाउँछ।",
        choices:[ {label:"New plastic bottle", label_ne:"नयाँ प्लास्टिक बोतल", correct:false, co2Impact:0.4, effect:"leaves_wither"}, {label:"Refill steel bottle", label_ne:"स्टिल बोतल भर्ने", correct:true, co2Impact:0.4, effect:"leaves_grow"} ] },
      { prompt:"Your Dhulikhel school's south roof gets bright sun. Put on it…", prompt_ne:"धुलिखेल स्कुलको दक्षिणी छतमा घाम राम्रो लाग्छ। त्यहाँ के राख्ने?", landmark:"school", spot:"School roof", spot_ne:"स्कुल छत",
        explainRight:"Rooftop solar (~0.04 kg/kWh) cuts diesel-backup and dirty grid load.", explainRight_ne:"छतको सोलार (~०.०४ किलो/kWh)ले डिजेल ब्याकअप र फोहोर ग्रिड घटाउँछ।",
        choices:[ {label:"Leave it bare", label_ne:"खाली छोड्ने", correct:false, co2Impact:1.0, effect:"sky_hazy"}, {label:"Install rooftop solar", label_ne:"छतमा सोलार जडान", correct:true, co2Impact:1.0, effect:"add_tree"} ] },
    ] },
  { id:7, name:"Janakpur", name_ne:"जनकपुर", theme:{ ground:0x9cae5a, sky:0x9fd6ec, accent:0xc25b7a },
    blurb:"Mithila city — Janaki Mandir, sacred ponds and festivals.", blurb_ne:"मिथिला सहर — जानकी मन्दिर, पवित्र पोखरी र चाडपर्व।",
    events:[
      { prompt:"Pilgrims gather at the sacred Ganga Sagar pond. The festival waste should go…", prompt_ne:"पवित्र गंगासागर पोखरीमा तीर्थयात्री भेला हुन्छन्। चाडको फोहोर कहाँ?", landmark:"pond", spot:"Ganga Sagar", spot_ne:"गंगासागर",
        explainRight:"Keeping waste out of the kunda protects the water; rotting waste in it releases methane.", explainRight_ne:"पोखरीमा फोहोर नहाल्दा पानी जोगिन्छ; कुहिने फोहोरले मिथेन निकाल्छ।",
        choices:[ {label:"Throw it in the pond", label_ne:"पोखरीमा फाल्ने", correct:false, co2Impact:0.6, effect:"river_dirty"}, {label:"Use proper bins", label_ne:"बिनमा हाल्ने", correct:true, co2Impact:0.6, effect:"river_clean"} ] },
      { prompt:"Cooking for the Vivaha Panchami festival, use…", prompt_ne:"विवाह पञ्चमी चाडको खाना कुन इन्धनमा पकाउने?", landmark:"house", spot:"Mithila home", spot_ne:"मिथिला घर",
        explainRight:"LPG burns far cleaner than firewood (~1.75 kg CO₂/kg) and protects indoor air.", explainRight_ne:"ग्यास दाउरा (~१.७५ किलो CO₂/किलो) भन्दा सफा छ र घरभित्रको हावा जोगाउँछ।",
        choices:[ {label:"Open firewood", label_ne:"खुला दाउरा", correct:false, co2Impact:1.747, effect:"smog_on"}, {label:"LPG gas stove", label_ne:"एलपीजी ग्यास", correct:true, co2Impact:1.747, effect:"leaves_grow"} ] },
      { prompt:"At the Janakpur bazaar, carry your shopping in…", prompt_ne:"जनकपुर बजारमा सामान केमा बोक्ने?", landmark:"shop", spot:"Bazaar stall", spot_ne:"बजार पसल",
        explainRight:"A reusable jute bag — a Terai product — avoids plastic that is later burned (~2.1 kg CO₂/kg).", explainRight_ne:"पुनःप्रयोगयोग्य जुटको झोला (तराईकै उत्पादन)ले पछि जलाइने प्लास्टिक (~२.१ किलो CO₂/किलो) जोगाउँछ।",
        choices:[ {label:"Plastic bag", label_ne:"प्लास्टिक झोला", correct:false, co2Impact:0.3, effect:"leaves_wither"}, {label:"Jute / cloth bag", label_ne:"जुट/कपडाको झोला", correct:true, co2Impact:0.3, effect:"leaves_grow"} ] },
      { prompt:"Travel from the station to Janaki Mandir by…", prompt_ne:"स्टेसनबाट जानकी मन्दिर कसरी जाने?", landmark:"busstop", spot:"Rail station", spot_ne:"रेल स्टेसन",
        explainRight:"Janakpur's cycle-rickshaws emit nothing; a taxi adds ~0.5 kg for the short hop.", explainRight_ne:"जनकपुरको रिक्सा शून्य उत्सर्जन; ट्याक्सीले छोटो दूरीमा ~०.५ किलो थप्छ।",
        choices:[ {label:"Private taxi", label_ne:"निजी ट्याक्सी", correct:false, co2Impact:0.5, effect:"sky_hazy"}, {label:"Cycle-rickshaw", label_ne:"साइकल रिक्सा", correct:true, co2Impact:0.5, effect:"sky_clear"} ] },
      { prompt:"After the puja, the marigold garlands and leaves should be…", prompt_ne:"पूजापछि सयपत्री माला र पात के गर्ने?", landmark:"leafpile", spot:"Temple yard", spot_ne:"मन्दिर आँगन",
        explainRight:"Composting flowers avoids ~2.04 kg CO₂/kg vs burning and feeds the temple garden.", explainRight_ne:"फूल कम्पोस्ट गर्दा जलाउनेभन्दा ~२.०४ किलो CO₂/किलो बच्छ र बगैँचा मलिलो हुन्छ।",
        choices:[ {label:"Burn them", label_ne:"जलाउने", correct:false, co2Impact:2.04, effect:"smog_on"}, {label:"Compost them", label_ne:"कम्पोस्ट गर्ने", correct:true, co2Impact:2.04, effect:"add_tree"} ] },
    ] },
  { id:8, name:"Lumbini", name_ne:"लुम्बिनी", theme:{ ground:0x86b352, sky:0x9fd6ec, accent:0xc9a227 },
    blurb:"Birthplace of the Buddha — sacred garden and monasteries.", blurb_ne:"बुद्धको जन्मस्थल — पवित्र बगैँचा र गुम्बाहरू।",
    events:[
      { prompt:"Keep the holy Puskarini pond, where Queen Maya bathed…", prompt_ne:"रानी मायादेवीले स्नान गरेको पवित्र पुष्करिणी पोखरी…", landmark:"pond", spot:"Puskarini pond", spot_ne:"पुष्करिणी पोखरी",
        explainRight:"A clean sacred pond protects the water; decomposing waste in it releases methane.", explainRight_ne:"सफा पवित्र पोखरीले पानी जोगाउँछ; कुहिने फोहोरले मिथेन निकाल्छ।",
        choices:[ {label:"Drop litter & offerings in", label_ne:"फोहोर/चढाव हाल्ने", correct:false, co2Impact:0.5, effect:"river_dirty"}, {label:"Keep it clean, use bins", label_ne:"सफा राख्ने, बिन प्रयोग", correct:true, co2Impact:0.5, effect:"river_clean"} ] },
      { prompt:"Pilgrims tie offerings on the Bodhi tree. Use…", prompt_ne:"तीर्थयात्रीले बोधि वृक्षमा चढाव बाँध्छन्। के प्रयोग गर्ने?", landmark:"bodhitree", spot:"Bodhi tree", spot_ne:"बोधि वृक्ष",
        explainRight:"Plastic tied to trees is later burned (~2.1 kg CO₂/kg); cloth and biodegradable offerings don't pollute.", explainRight_ne:"रूखमा बाँधेको प्लास्टिक पछि जलाइन्छ (~२.१ किलो CO₂/किलो); कपडा/प्राकृतिक चढावले प्रदूषण गर्दैन।",
        choices:[ {label:"Plastic ribbons & foil", label_ne:"प्लास्टिक रिबन र फोइल", correct:false, co2Impact:0.3, effect:"leaves_wither"}, {label:"Cloth khata / biodegradable", label_ne:"कपडाको खादा / प्राकृतिक", correct:true, co2Impact:0.3, effect:"leaves_grow"} ] },
      { prompt:"Visit the monasteries across the 3 km Monastic Zone by…", prompt_ne:"३ किमि मोनास्टिक क्षेत्रका गुम्बाहरू कसरी घुम्ने?", landmark:"monastery", spot:"Monastic Zone", spot_ne:"मोनास्टिक क्षेत्र",
        explainRight:"Lumbini promotes cycling and e-rickshaws; a diesel van adds ~0.6 kg and noise in a place of peace.", explainRight_ne:"लुम्बिनीले साइकल र इ-रिक्सा प्रवर्द्धन गर्छ; डिजेल भ्यानले ~०.६ किलो र शान्त ठाउँमा हल्ला थप्छ।",
        choices:[ {label:"Diesel van", label_ne:"डिजेल भ्यान", correct:false, co2Impact:0.6, effect:"sky_hazy"}, {label:"Cycle or e-rickshaw", label_ne:"साइकल वा इ-रिक्सा", correct:true, co2Impact:0.6, effect:"sky_clear"} ] },
      { prompt:"The marshy wetland by Lumbini shelters sarus cranes. It should be…", prompt_ne:"लुम्बिनी छेउको सिमसार सारस क्रौँचको बासस्थान हो। यो…", landmark:"riverbank", spot:"Crane wetland", spot_ne:"सारस सिमसार",
        explainRight:"Wetlands store huge amounts of carbon and shelter the endangered sarus crane; draining them releases it.", explainRight_ne:"सिमसारले धेरै कार्बन भण्डारण गर्छ र लोपोन्मुख सारसलाई आश्रय दिन्छ; सुकाउँदा त्यो निस्कन्छ।",
        choices:[ {label:"Drain for a car park", label_ne:"पार्किङका लागि सुकाउने", correct:false, co2Impact:1.5, effect:"leaves_wither"}, {label:"Protect the wetland", label_ne:"सिमसार जोगाउने", correct:true, co2Impact:1.5, effect:"add_tree"} ] },
      { prompt:"Thirsty pilgrims at Lumbini should drink from…", prompt_ne:"लुम्बिनीमा तिर्खाएका तीर्थयात्री केबाट पिउने?", landmark:"waterstation", spot:"Refill point", spot_ne:"पुनर्भरण केन्द्र",
        explainRight:"Refill stations cut single-use plastic (~2.1 kg CO₂/kg) across millions of visitors.", explainRight_ne:"पुनर्भरण केन्द्रले लाखौँ आगन्तुकको एकल-प्रयोग प्लास्टिक (~२.१ किलो CO₂/किलो) घटाउँछ।",
        choices:[ {label:"New plastic bottles", label_ne:"नयाँ प्लास्टिक बोतल", correct:false, co2Impact:0.4, effect:"leaves_wither"}, {label:"Refill / steel bottle", label_ne:"पुनर्भरण / स्टिल बोतल", correct:true, co2Impact:0.4, effect:"leaves_grow"} ] },
    ] },
  { id:9, name:"Shuklaphanta", name_ne:"शुक्लाफाँटा", theme:{ ground:0x9cb85a, sky:0x9fd6ec, accent:0x3f8f3a },
    blurb:"Far-west grassland & sal forest — wildlife and wetland.", blurb_ne:"सुदूरपश्चिम घाँसे मैदान र सालको वन — वन्यजन्तु र सिमसार।",
    events:[
      { prompt:"In your Tharu home near the grassland, cook the evening meal on…", prompt_ne:"घाँसे मैदान नजिकको थारू घरमा बेलुकाको खाना कुन इन्धनमा पकाउने?", landmark:"house", spot:"Tharu home", spot_ne:"थारू घर",
        explainRight:"Biogas from cattle dung avoids firewood smoke (~1.75 kg CO₂/kg) and protects the sal forest.", explainRight_ne:"गोबर ग्यासले दाउराको धुवाँ (~१.७५ किलो CO₂/किलो) हटाउँछ र सालको वन जोगाउँछ।",
        choices:[ {label:"Open firewood", label_ne:"खुला दाउरा", correct:false, co2Impact:1.747, effect:"smog_on"}, {label:"Biogas stove", label_ne:"गोबर ग्यास", correct:true, co2Impact:1.747, effect:"leaves_grow"} ] },
      { prompt:"The wetland shelters swamp deer and birds. Developers want to drain it. You…", prompt_ne:"सिमसारले बाह्रसिंगे र चराको बास दिन्छ। विकासकर्ताले सुकाउन चाहन्छन्। तपाईं…", landmark:"riverbank", spot:"Wetland", spot_ne:"सिमसार",
        explainRight:"Wetlands store huge carbon and shelter rare swamp deer; draining them releases it and destroys habitat.", explainRight_ne:"सिमसारले धेरै कार्बन भण्डारण गर्छ र दुर्लभ बाह्रसिंगेको बास हो; सुकाउँदा त्यो निस्कन्छ र बास नष्ट हुन्छ।",
        choices:[ {label:"Drain it", label_ne:"सुकाउने", correct:false, co2Impact:1.5, effect:"river_dirty"}, {label:"Protect it", label_ne:"जोगाउने", correct:true, co2Impact:1.5, effect:"add_tree"} ] },
      { prompt:"Replanting the buffer forest — which sapling?", prompt_ne:"मध्यवर्ती वन पुनःरोपण — कुन बिरुवा?", landmark:"nursery", spot:"Forest nursery", spot_ne:"वन नर्सरी",
        explainRight:"Native sal stores more carbon and supports local wildlife better than fast exotic eucalyptus.", explainRight_ne:"रैथाने सालले छिटो बढ्ने विदेशी युकलिप्टसभन्दा बढी कार्बन भण्डारण गर्छ र वन्यजन्तुलाई सघाउँछ।",
        choices:[ {label:"Exotic eucalyptus", label_ne:"विदेशी युकलिप्टस", correct:false, co2Impact:0.5, effect:"leaves_wither"}, {label:"Native sal", label_ne:"रैथाने साल", correct:true, co2Impact:0.5, effect:"add_tree"} ] },
      { prompt:"The dry grassland could be cleared by fire. The safe way is…", prompt_ne:"सुक्खा घाँसे मैदान आगोले सफा गर्न सकिन्छ। सुरक्षित तरिका…", landmark:"leafpile", spot:"Dry grassland", spot_ne:"सुक्खा मैदान",
        explainRight:"Uncontrolled grass fires release CO₂, kill wildlife and escape into the forest; managed cutting and composting is safe.", explainRight_ne:"अनियन्त्रित डढेलोले CO₂ निकाल्छ, वन्यजन्तु मार्छ र वनमा फैलिन्छ; व्यवस्थित कटान र कम्पोस्ट सुरक्षित छ।",
        choices:[ {label:"Burn the grass", label_ne:"घाँस जलाउने", correct:false, co2Impact:2.04, effect:"smog_on"}, {label:"Cut & compost", label_ne:"काटेर कम्पोस्ट", correct:true, co2Impact:2.04, effect:"leaves_grow"} ] },
      { prompt:"Taking visitors on a park safari, travel by…", prompt_ne:"पाहुनालाई निकुञ्ज सफारीमा कसरी लैजाने?", landmark:"signpost", spot:"Safari trail", spot_ne:"सफारी बाटो",
        explainRight:"An electric jeep or a nature walk keeps the air and quiet of the park; a diesel jeep adds ~0.5 kg and noise.", explainRight_ne:"विद्युतीय जिप वा पैदल हिँडाइले निकुञ्जको हावा र शान्ति जोगाउँछ; डिजेल जिपले ~०.५ किलो र हल्ला थप्छ।",
        choices:[ {label:"Diesel jeep", label_ne:"डिजेल जिप", correct:false, co2Impact:0.5, effect:"sky_hazy"}, {label:"Electric jeep / walk", label_ne:"विद्युतीय जिप / पैदल", correct:true, co2Impact:0.5, effect:"sky_clear"} ] },
    ] },
];

export function completeLevel(decisions) {
  const correct = decisions.filter(d => d.isCorrect).length;
  const pct = (correct / decisions.length) * 100;
  const co2Delta = decisions.reduce((s, d) => s + (d.isCorrect ? -d.co2Impact : d.co2Impact), 0);
  return {
    correct, total: decisions.length,
    passed: pct >= 60,
    scorePercent: Math.round(pct),
    co2Delta: +co2Delta.toFixed(2),
    unlockNext: pct >= 60,
  };
}

/* ============================================================================
 * FOREST ARENA — hex math, economy, 30 questions
 * ==========================================================================*/
export function hexToWorld(q, r) {
  return { x: 1.8 * q, z: 1.8 * (r + q * 0.5) };
}
// 6 axial directions for flat-top hex adjacency
export const HEX_DIRS = [ [1,0],[1,-1],[0,-1],[-1,0],[-1,1],[0,1] ];
export function hexNeighbors(q, r) { return HEX_DIRS.map(([dq,dr]) => [q+dq, r+dr]); }

export const ARENA_ECON = {
  correctPoints: 10, wrongPoints: -8, correctTrees: 2, wrongTrees: -1,
  claimCost: 50, minTrees: 0, maxTrees: 20,
};

export function forestHealthState(trees) {
  if (trees <= 2)  return { label:'Degraded',   color:0x8b6914, hex:'#8b6914'};
  if (trees <= 6)  return { label:'Young',       color:0x95d5b2, hex:'#95d5b2'};
  if (trees <= 11) return { label:'Healthy',     color:0x52b788, hex:'#52b788'};
  if (trees <= 16) return { label:'Thriving',    color:0x2d6a4f, hex:'#2d6a4f'};
  return { label:'Old Growth', color:0x1b4332, hex:'#1b4332', emissive:0x52b788 };
}

export const ARENA_QUESTIONS = [
  { q:'Which waste method releases the MOST CO₂ in Nepal?', options:['Composting','Municipal landfill','Open burning','Recycling'], answer:2, why:'Open burning ≈ 2.1 kg CO₂/kg plus toxic dioxins — the worst option.'},
  { q:"Nepal's electricity grid factor is about…", options:['0.12 kg/kWh','0.40 kg/kWh','0.716 kg/kWh','1.20 kg/kWh'], answer:0, why:'Nepal\'s grid is ~82% hydro + ~18% Indian import, giving a blended factor of only about 0.12 kg/kWh.'},
  { q:'Which emits LESS per meal?', options:['Packaged chips','Dal bhat','Meat-heavy meal','They are equal'], answer:1, why:'Dal bhat ≈ 0.35 kg vs packaged ≈ 1.2 kg CO₂/meal.'},
  { q:'About how much CO₂ does one tree absorb per year?', options:['2 kg','21 kg','100 kg','500 kg'], answer:1, why:'IPCC Tier-1 broadleaf ≈ 21 kg CO₂/tree/year.'},
  { q:'Roughly what % of Nepal is forested?', options:['12%','25%','44%','70%'], answer:2, why:'Nepal is about 44% forest cover — a real carbon asset.'},
  { q:'Open burning of 1 kg of plastic emits about…', options:['0.06 kg','0.5 kg','2.1 kg','10 kg'], answer:2, why:'≈ 2.1 kg CO₂e per kg, plus dioxins.'},
  { q:'A pressure cooker reduces firewood use by about…', options:['5%','40%','80%','0%'], answer:1, why:'≈ 40% less firewood — and faster cooking.'},
  { q:'Student commuting belongs to which scope?', options:['Scope 1','Scope 2','Scope 3','None'], answer:2, why:'Commuting is indirect value-chain — Scope 3.'},
  { q:'Best action for school food waste?', options:['Burn it','Landfill','Compost','Dump in river'], answer:2, why:'Compost ≈ 0.06 kg CO₂/kg — the lowest.'},
  { q:'Which cooking fuel has the highest emission factor per kg?', options:['Firewood','LPG','Biogas','Solar'], answer:1, why:'LPG ≈ 2.983 kg CO₂/kg (firewood ≈ 1.747/kg).'},
  { q:'Grid electricity for a school is which scope?', options:['Scope 1','Scope 2','Scope 3','Scope 4'], answer:1, why:'Purchased electricity = Scope 2.'},
  { q:'LPG cooking and diesel generators are which scope?', options:['Scope 1','Scope 2','Scope 3','Scope 0'], answer:0, why:'Direct on-site combustion = Scope 1.'},
  { q:'Solar electricity emission factor is about…', options:['0.79 kg/kWh','0.40 kg/kWh','0.04 kg/kWh','0 kg/kWh'], answer:2, why:'≈ 0.04 kg/kWh lifecycle — far cleaner than grid.'},
  { q:'Public bus emission factor per km?', options:['0.089 kg','0.192 kg','0.5 kg','0.001 kg'], answer:0, why:'≈ 0.089 kg CO₂/km (shared).'},
  { q:'Private car emission factor per km?', options:['0.089 kg','0.113 kg','0.192 kg','0.04 kg'], answer:2, why:'≈ 0.192 kg CO₂/km (DEFRA petrol avg).'},
  { q:'Why is firewood soot extra harmful in Nepal?', options:['Smells bad','Black carbon melts glaciers','It is heavy','No reason'], answer:1, why:'Black carbon darkens snow and speeds Himalayan glacier melt.'},
  { q:'Water treatment & pumping emits about…', options:['0.0003 kg/L','0.03 kg/L','0.3 kg/L','3 kg/L'], answer:0, why:'≈ 0.0003 kg CO₂/litre.'},
  { q:'Which transport emits ~zero CO₂?', options:['Microbus','Motorbike','Walking','Car'], answer:2, why:'Walking and cycling ≈ 0 kg/km.'},
  { q:'Best fix for a dripping tap?', options:['Ignore it','Fix it','Open it more','Drink it'], answer:1, why:'Fixing leaks saves water and the energy to treat it.'},
  { q:'AWD irrigation cuts paddy methane by about…', options:['0%','30%','90%','100%'], answer:1, why:'Alternate wet-dry ≈ 30% less methane from rice paddies.'},
  { q:'Cement emits roughly…', options:['0.04 kg/kg','0.5 kg/kg','0.81 kg/kg','5 kg/kg'], answer:2, why:'≈ 0.81 kg CO₂/kg — local stone is lower-carbon.'},
  { q:'A refillable steel bottle mainly prevents…', options:['Water waste','Future plastic burning','Noise','Traffic'], answer:1, why:'It avoids single-use plastic that often ends up burned.'},
  { q:'Diesel emits about how much CO₂ per litre?', options:['0.79 kg','1.5 kg','2.68 kg','10 kg'], answer:2, why:'≈ 2.68 kg CO₂/litre.'},
  { q:'Which planting is best for resilience?', options:['Monoculture pine','Native mixed forest','Concrete','Nothing'], answer:1, why:'Native mixed forest is more resilient and biodiverse.'},
  { q:'GLOF stands for…', options:['Green Land Of Forest','Glacial Lake Outburst Flood','Global Low Force','Grid Load Off'], answer:1, why:'A real Himalayan hazard worsened by warming.'},
  { q:'Microbus emission factor per km is about…', options:['0.089 kg','0.113 kg','0.192 kg','0.04 kg'], answer:1, why:'≈ 0.113 kg CO₂/km — higher than a big bus per person.'},
  { q:'Rainwater harvesting mainly…', options:['Wastes water','Cuts pumped-supply demand','Causes floods','Heats water'], answer:1, why:'It reduces demand on pumped, treated supply.'},
  { q:'Which meal supports Nepali farmers most?', options:['Imported snacks','Local dal bhat','Frozen meat','Canned food'], answer:1, why:'Local food cuts import emissions and keeps rupees in Nepal.'},
  { q:'The red panda is found in Nepal\'s…', options:['Terai plains','Eastern mid-hill forests','City parks','Deserts'], answer:1, why:'Near-threatened, it lives in eastern mid-hill forests like Ilam.'},
  { q:'The single most impactful waste change for a Nepal school is…', options:['Buy more bins','Stop open burning','Print less','Paint walls'], answer:1, why:'Ending open burning removes the highest-emission, most toxic practice.'},
];

/* ─── Offline Bana fallback lines (used when Ollama is unreachable) ───────*/
export const BANA_FALLBACK = {
  greeting:"Namaste! I'm Bana, a red panda from Nepal's forests. Let's measure your carbon footprint together — it only takes a few minutes. Ramro cha!",
  high:"Whoa, that's a big footprint — but every small change helps! Pick ONE tip below and try it this week. You've got this!",
  medium:"You're close to Nepal's average. A couple of easy swaps and you'll be a true Eco Champion. Dhanyabad for caring!",
  low:"Ramro cha! Your footprint is low — you're already a friend to the forest. Help one classmate do the same this week!",
  offline:"Bana is in the forest right now — showing saved wisdom instead!",
};

export const BANA_FALLBACK_NE = {
  greeting:"नमस्ते! म बाना, नेपालका जंगलको रातो पाण्डा। सँगै तपाईंको कार्बन फुटप्रिन्ट नापौं — केही मिनेट मात्र लाग्छ। राम्रो छ!",
  high:"ओहो, फुटप्रिन्ट ठूलो छ — तर हरेक सानो परिवर्तनले मद्दत गर्छ! तलको एउटा सुझाव रोजी यो हप्ता प्रयास गर्नुहोस्। तपाईंले सक्नुहुन्छ!",
  medium:"तपाईं नेपाल औसतको नजिक हुनुहुन्छ। केही सजिला फेरबदलले साँचो इको च्याम्पियन बन्नुहुनेछ। ख्याल गरेकोमा धन्यवाद!",
  low:"राम्रो छ! तपाईंको फुटप्रिन्ट कम छ — तपाईं पहिल्यै जंगलको साथी हुनुहुन्छ। यो हप्ता एक सहपाठीलाई पनि सघाउनुहोस्!",
  offline:"बाना अहिले जंगलमा छिन् — सुरक्षित ज्ञान देखाउँदै!",
};
