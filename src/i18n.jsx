import React, { createContext, useContext, useEffect, useState } from 'react';

// Full bilingual dictionary. t('a.b.c') reads STR[lang].a.b.c with English fallback.
export const STR = {
  en: {
    nav: { profile: 'Profile', calc: 'Calculator', school: 'Green School', explore: 'Explore', city: 'Mission', map: 'Map', world: 'World', ask: 'Ask Bana', langName: 'EN' },
    calc: {
      pill: 'See your day\'s carbon · Grade 6–10', title: 'Measure your carbon footprint',
      intro: 'Answer a few simple questions about your day. Your Eco Score and full breakdown appear at the end — so answer honestly.',
      pledgeTitle: "Bana's Honesty Pledge", pledgeStamp: 'teacher-reviewed',
      pledgeBody: "Answer truthfully — your teacher can open these results. You can fool the meter, but you can't fool the forest!",
      back: 'Back', next: 'Next', reveal: 'See my Eco Score', best: 'Best', perDay: 'kg CO₂/day',
      vsAvg: 'vs Nepal student avg', biggest: 'biggest source', sceneWord: 'Question',
      hint: "We don't show the 'best' answer while you choose — your score is revealed only at the end.",
      yes: 'Yes', no: 'No',
      level: { tiny: 'Tiny', low: 'Low', medium: 'Medium', high: 'High' },
      steps: {
        transport: { title: 'How do you get to school?', bana: "Namaste! Let's start with your trip to school. How do you travel — and how far is it one way?",
          choices: { walk: 'Walk', bicycle: 'Cycle', bus: 'Bus / Microbus', motorbike: 'Motorbike', car: 'Car / Jeep' },
          sliders: { distanceKm: 'Distance to school (one way)' } },
        electricity: { title: 'Electricity at home', bana: "Nepal's electricity is mostly hydropower, so it's fairly clean. Check your NEA bill — how many units (kWh) does your home use in a month?",
          sliders: { electricityUnits: 'Units used per month' }, help: 'Your monthly NEA bill shows this number in "units" (kWh).',
          toggles: { hasSolar: 'Does your home have solar panels?' } },
        cooking: { title: 'Cooking gas at home', bana: 'Most homes cook with LPG gas. One cylinder in Nepal holds 14.2 kg. How many cylinders does your family use in a month?',
          sliders: { lpgCylinders: 'LPG cylinders per month' }, help: 'One LPG cylinder = 14.2 kg. Put 0 if your family does not use gas.' },
        waste: { title: 'Waste you throw each day', bana: 'Think about the rubbish you throw away in a day. Less waste — and composting food scraps — keeps your footprint low.',
          choices: { little: 'A little (½ bag)', medium: 'Medium (1 bag)', lot: 'A lot (2+ bags)' } },
        stationery: { title: 'Stationery you buy', bana: 'Notebooks, pens and paper have a hidden carbon cost too. About how much does your family spend on stationery each month?',
          sliders: { stationeryNpr: 'Stationery spend per month' }, help: 'A rough guess is fine — for example Rs 200–400 a month.' },
      },
    },
    explore: {
      level: 'Level', blurbAdd: ' Walk up to a building — its glowing ring and label show a real Nepal choice. Good choices heal the world around you.',
      replay: 'Replay', nextLevel: 'Next level', cleared: 'Level cleared! Next world unlocked!',
      clearedAll: 'You finished all five worlds — a true Eco Explorer!', failAgain: 'So close — the world needs you. Try again!',
      tapContinue: 'tap to continue', heals: 'kg CO₂ — the world heals', added: 'kg CO₂ added',
      instr: 'Move · F fullscreen · drag to rotate, scroll to zoom · reach \u226560% correct to unlock the next world.',
    },
    result: {
      pill: 'Your Result', startOver: 'Start over', daily: 'DAILY', monthly: 'MONTHLY', yearly: 'YEARLY',
      fromWhere: 'Where it comes from', tapSlice: 'Tap a slice to see what it cost the world',
      compare: 'How you compare', you: 'You', nepalAvg: 'Nepal avg', globalAvg: 'Global avg',
      benchNote: 'Nepal student avg \u2248 4.5 \u00b7 Global avg \u2248 13.7 kg CO\u2082/day',
      treesTitle: 'Trees to cancel out your carbon', treesNeedA: 'You need', treesNeedB: 'more tree(s) growing for a year to soak up your carbon.',
      tipsTitle: 'Your top tips \u2014 and what you save', allGood: "You're already doing great across the board \u2014 keep it up and bring a friend along!",
      challenge: "Bana's challenge: try ONE tip this week and tell your class!", thinking: 'Bana is thinking\u2026', unit: 'kg CO\u2082/day',
      score: { champion: 'Eco Champion', greener: 'Getting Greener', room: 'Room to Grow', emergency: 'Climate Emergency' },
    },
    ask: {
      pill: 'Ask Bana · your green guide', title: 'Chat with Bana',
      intro: "Bana is an on-device AI assistant that reads her Nepal climate notebook to help you. Ask anything — or ask for help and she'll plan her steps, ask a few quick questions, and build a plan tailored to you. She remembers your chat.",
      connecting: ' · waking up…', ready: ' · online · knows your data', keyword: ' · online', local: ' · offline mode — built-in tips', offline: ' · offline',
      welcome: "Namaste! I'm Bana. Ask me about your carbon footprint, cooking, transport, trees or waste in Nepal — or tap a starter below.",
      placeholder: 'Ask Bana, or say "help me reduce my footprint"…', placeholderOff: 'Bana is offline right now…',
      sources: "From Bana's notebook:", makePlan: 'Make me a plan for this',
      planIntro: "Namaste! I'd love to build a plan that fits your life. Just tap a few answers.",
      ambigIntro: 'Happy to help! A couple of quick questions so my plan fits you.', writingPlan: 'Dhanyabad! Reading my notebook and writing a plan just for you…',
      error: 'Bana wandered into the forest for a moment — please try again.',
      offlineHint: "Bana's full chat assistant isn't available right now, but the built-in eco tips still work.",
      stepsAnswer: ["Searching Bana's notebook", 'Grounding in Nepal facts', 'Replying'],
      stepsPlan: ["Searching Bana's notebook", 'Writing your Nepal plan'],
      refine: ['Make it a 30-day plan', 'No-cost options only', 'Add a school action', 'What can I do today?'],
      suggestions: ['How can I reduce my carbon footprint?', 'Is electricity clean in Nepal?', 'Why is cooking on firewood bad?', 'What trees should I plant?', 'Best way to get to school?'],
      flow: {
        area: { q: 'First — where do you live? It changes what works best.', options: ['Kathmandu / big city', 'A town or bazaar', 'Terai village (plains)', 'Hill village', 'Mountain / trek area'] },
        focus: { q: 'Which part of your life should we tackle first?', options: ['Travel & transport', 'Cooking & home energy', 'Food & kitchen', 'Waste & plastic'] },
        detail: {
          transport: { q: 'How do you usually get to school?', options: ['Walk', 'Cycle', 'Public bus / micro', 'Motorbike', 'Private car'] },
          cooking: { q: 'What does your family mainly cook with?', options: ['Firewood', 'LPG gas', 'Biogas', 'Electric induction'] },
          food: { q: 'What is your usual school lunch?', options: ['Local dal bhat', 'Packaged snacks', 'Meat-heavy meal', 'Veg meal'] },
          waste: { q: 'How is waste handled at home now?', options: ['We compost', 'Municipal bin', 'We burn it', 'Open dump'] },
        },
      },
    },
  },
  ne: {
    nav: { profile: 'प्रोफाइल', calc: 'क्यालकुलेटर', school: 'हरित विद्यालय', explore: 'अन्वेषण', city: 'मिसन', map: 'नक्सा', world: 'संसार', ask: 'बानालाई सोध्नुहोस्', langName: 'ने' },
    calc: {
      pill: 'आफ्नो दिनको कार्बन हेर्नुहोस् · कक्षा ६–१०', title: 'आफ्नो कार्बन फुटप्रिन्ट नाप्नुहोस्',
      intro: 'आफ्नो दिनबारे केही सरल प्रश्नको उत्तर दिनुहोस्। तपाईंको इको स्कोर र पूरा विवरण अन्त्यमा देखिन्छ — त्यसैले इमानदारीपूर्वक उत्तर दिनुहोस्।',
      pledgeTitle: 'बानाको इमानदारी प्रतिज्ञा', pledgeStamp: 'शिक्षकद्वारा जाँचिने',
      pledgeBody: 'सत्य उत्तर दिनुहोस् — तपाईंको शिक्षकले यो नतिजा हेर्न सक्नुहुन्छ। मिटरलाई छल्न सकिएला, तर जंगललाई छल्न सकिँदैन!',
      back: 'पछाडि', next: 'अर्को', reveal: 'मेरो इको स्कोर हेर्नुहोस्', best: 'उत्तम', perDay: 'किलो CO₂/दिन',
      vsAvg: 'नेपाली विद्यार्थी औसतसँग तुलना', biggest: 'सबैभन्दा ठूलो स्रोत', sceneWord: 'प्रश्न',
      hint: 'उत्तर छनोट गर्दा हामी "उत्तम" विकल्प देखाउँदैनौं — तपाईंको स्कोर अन्त्यमा मात्र देखिन्छ।',
      yes: 'छ', no: 'छैन',
      level: { tiny: 'सानो', low: 'कम', medium: 'मध्यम', high: 'उच्च' },
      steps: {
        transport: { title: 'तपाईं विद्यालय कसरी जानुहुन्छ?', bana: 'नमस्ते! पहिले विद्यालय जाने यात्राबाट सुरु गरौं। तपाईं कसरी जानुहुन्छ — र एकातर्फ कति टाढा छ?',
          choices: { walk: 'हिँडेर', bicycle: 'साइकलमा', bus: 'बस / माइक्रोबस', motorbike: 'मोटरसाइकल', car: 'कार / जिप' },
          sliders: { distanceKm: 'विद्यालयसम्मको दूरी (एकातर्फ)' } },
        electricity: { title: 'घरको बिजुली', bana: 'नेपालको बिजुली प्रायः जलविद्युत् भएकाले अलि सफा छ। आफ्नो विद्युत् महसुल हेर्नुहोस् — तपाईंको घरले महिनामा कति युनिट (kWh) खपत गर्छ?',
          sliders: { electricityUnits: 'महिनामा खपत युनिट' }, help: 'तपाईंको मासिक विद्युत् बिलमा यो संख्या "युनिट" (kWh) मा लेखिएको हुन्छ।',
          toggles: { hasSolar: 'तपाईंको घरमा सौर्य प्यानल छ?' } },
        cooking: { title: 'घरको खाना पकाउने ग्यास', bana: 'धेरै घरले एलपीजी ग्यासले खाना पकाउँछन्। नेपालमा एक सिलिन्डरमा १४.२ किलो हुन्छ। तपाईंको परिवारले महिनामा कति सिलिन्डर प्रयोग गर्छ?',
          sliders: { lpgCylinders: 'महिनामा एलपीजी सिलिन्डर' }, help: 'एक एलपीजी सिलिन्डर = १४.२ किलो। परिवारले ग्यास नचलाए ० राख्नुहोस्।' },
        waste: { title: 'दैनिक फाल्ने फोहोर', bana: 'दिनभरि तपाईंले फाल्ने फोहोरबारे सोच्नुहोस्। कम फोहोर — र खानाको फोहोरलाई कम्पोस्ट बनाउँदा — फुटप्रिन्ट कम राख्छ।',
          choices: { little: 'थोरै (आधा झोला)', medium: 'मध्यम (१ झोला)', lot: 'धेरै (२+ झोला)' } },
        stationery: { title: 'किन्ने स्टेसनरी', bana: 'कापी, कलम र कागजको पनि लुकेको कार्बन लागत हुन्छ। तपाईंको परिवारले महिनामा करिब कति स्टेसनरीमा खर्च गर्छ?',
          sliders: { stationeryNpr: 'महिनामा स्टेसनरी खर्च' }, help: 'अनुमानित भए पुग्छ — उदाहरणका लागि महिनामा रु. २००–४००।' },
      },
    },
    explore: {
      level: 'तह', blurbAdd: ' कुनै भवननेर पुग्नुहोस् — यसको चम्कने घेरा र लेबलले नेपालको साँचो छनोट देखाउँछ। राम्रो छनोटले वरपरको संसार निको पार्छ।',
      replay: 'फेरि खेल्नुहोस्', nextLevel: 'अर्को तह', cleared: 'तह पार! अर्को संसार खुल्यो!',
      clearedAll: 'तपाईंले पाँचै संसार सक्नुभयो — साँचो इको अन्वेषक!', failAgain: 'अलिकति बाँकी — संसारलाई तपाईं चाहिन्छ। फेरि प्रयास!',
      tapContinue: 'जारी राख्न ट्याप गर्नुहोस्', heals: 'किलो CO₂ — संसार निको हुन्छ', added: 'किलो CO₂ थपियो',
      instr: 'हिँड्नुहोस् · F फुलस्क्रिन · घुमाउन ड्र्याग, जुम गर्न स्क्रोल · अर्को संसार खोल्न \u226560% सही पुर्\u200dयाउनुहोस्।',
    },
    result: {
      pill: 'तपाईंको नतिजा', startOver: 'फेरि सुरु', daily: 'दैनिक', monthly: 'मासिक', yearly: 'वार्षिक',
      fromWhere: 'कहाँबाट आउँछ', tapSlice: 'संसारलाई के लाग्यो हेर्न स्लाइसमा ट्याप गर्नुहोस्',
      compare: 'तुलना कस्तो', you: 'तपाईं', nepalAvg: 'नेपाल औसत', globalAvg: 'विश्व औसत',
      benchNote: 'नेपाली विद्यार्थी औसत \u2248 ४.५ \u00b7 विश्व औसत \u2248 १३.७ किलो CO\u2082/दिन',
      treesTitle: 'तपाईंको कार्बन हटाउन रूख', treesNeedA: 'तपाईंलाई', treesNeedB: 'थप रूख वर्षभरि हुर्किनु चाहिन्छ।',
      tipsTitle: 'तपाईंका मुख्य सुझाव — र के बचत', allGood: 'तपाईं सबैतिर राम्रो गरिरहनुभएको छ — यसै राख्नुहोस् र साथी ल्याउनुहोस्!',
      challenge: 'बानाको चुनौती: यो हप्ता एउटा सुझाव गरी कक्षालाई सुनाउनुहोस्!', thinking: 'बाना सोच्दै छिन्…', unit: 'किलो CO\u2082/दिन',
      score: { champion: 'इको च्याम्पियन', greener: 'हरियो हुँदै', room: 'सुधार्ने ठाउँ', emergency: 'जलवायु संकट' },
    },
    ask: {
      pill: 'बानालाई सोध्नुहोस् · तपाईंको हरित साथी', title: 'बानासँग कुराकानी',
      intro: 'बाना तपाईंको यन्त्रमै चल्ने एआई सहायक हो, जसले नेपालको जलवायु नोटबुक पढेर सघाउँछ। जे पनि सोध्नुहोस् — वा मद्दत माग्नुहोस्, उसले कदम योजना गर्छ, केही प्रश्न सोध्छ, र तपाईंलाई सुहाउने योजना बनाउँछ। उसले कुराकानी सम्झन्छ।',
      connecting: ' · जागृत हुँदै…', ready: ' · अनलाइन · तपाईंको डाटा थाहा छ', keyword: ' · अनलाइन', local: ' · अफलाइन मोड — बिल्ट-इन सुझाव', offline: ' · अफलाइन',
      welcome: 'नमस्ते! म बाना हुँ। आफ्नो कार्बन फुटप्रिन्ट, खाना, यातायात, रूख वा फोहोरबारे सोध्नुहोस् — वा तलको सुझाव ट्याप गर्नुहोस्।',
      placeholder: 'बानालाई सोध्नुहोस्, वा "मेरो फुटप्रिन्ट घटाउन मद्दत" भन्नुहोस्…', placeholderOff: 'बाना अहिले अफलाइन छ…',
      sources: 'बानाको नोटबुकबाट:', makePlan: 'यसको लागि योजना बनाइदिनुहोस्',
      planIntro: 'नमस्ते! तपाईंको जीवनसँग मिल्ने योजना बनाउन चाहन्छु। केही उत्तर ट्याप गर्नुहोस्।',
      ambigIntro: 'सघाउन पाउँदा खुसी! मेरो योजना तपाईंलाई सुहाओस् भनेर केही छोटा प्रश्न।', writingPlan: 'धन्यवाद! नोटबुक पढेर तपाईंकै लागि योजना लेख्दै…',
      error: 'बाना केही बेर जंगलतिर हराइन् — कृपया फेरि प्रयास गर्नुहोस्।',
      offlineHint: 'बानाको पूर्ण कुराकानी सहायक अहिले उपलब्ध छैन, तर बिल्ट-इन इको सुझावहरू अझै काम गर्छन्।',
      stepsAnswer: ['बानाको नोटबुक खोज्दै', 'नेपाल तथ्यमा आधार', 'जवाफ दिँदै'],
      stepsPlan: ['बानाको नोटबुक खोज्दै', 'तपाईंको नेपाल योजना लेख्दै'],
      refine: ['३० दिने योजना बनाऊ', 'खर्चबिनाका विकल्प मात्र', 'स्कुल कार्य थप', 'आज के गर्न सक्छु?'],
      suggestions: ['म आफ्नो कार्बन फुटप्रिन्ट कसरी घटाउँ?', 'नेपालमा बिजुली सफा छ?', 'दाउरामा पकाउनु किन नराम्रो?', 'कुन रूख रोप्ने?', 'स्कुल जाने उत्तम तरिका?'],
      flow: {
        area: { q: 'पहिले — तपाईं कहाँ बस्नुहुन्छ? यसले के राम्रो हुन्छ भन्ने फरक पार्छ।', options: ['काठमाडौं / ठूलो सहर', 'बजार वा सानो सहर', 'तराई गाउँ', 'पहाडी गाउँ', 'हिमाली / ट्रेक क्षेत्र'] },
        focus: { q: 'पहिले कुन भाग सुधार्ने?', options: ['यातायात', 'खाना पकाइ र घरको ऊर्जा', 'खाना र भान्सा', 'फोहोर र प्लास्टिक'] },
        detail: {
          transport: { q: 'तपाईं प्रायः स्कुल कसरी जानुहुन्छ?', options: ['हिँडेर', 'साइकल', 'सार्वजनिक बस / माइक्रो', 'मोटरसाइकल', 'निजी कार'] },
          cooking: { q: 'परिवारले मुख्यतः केले पकाउँछ?', options: ['दाउरा', 'एलपीजी ग्यास', 'बायोग्यास', 'इन्डक्सन'] },
          food: { q: 'स्कुलको सामान्य खाजा?', options: ['स्थानीय दालभात', 'प्याकेटको खाजा', 'मासुयुक्त खाना', 'सागसब्जी'] },
          waste: { q: 'घरमा अहिले फोहोर कसरी व्यवस्थापन हुन्छ?', options: ['कम्पोस्ट गर्छौं', 'नगर डस्टबिन', 'जलाउँछौं', 'खुला फाल्छौं'] },
        },
      },
    },
  },
};

const LangCtx = createContext({ lang: 'en', setLang: () => {}, t: (k) => k });

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try { return localStorage.getItem('harit_lang') === 'ne' ? 'ne' : 'en'; } catch (_) { return 'en'; }
  });
  const setLang = (l) => { setLangState(l); try { localStorage.setItem('harit_lang', l); } catch (_) { /* */ } };
  useEffect(() => { try { document.documentElement.lang = lang; } catch (_) { /* */ } }, [lang]);
  const t = (path) => {
    const get = (obj) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
    const v = get(STR[lang]);
    return v == null ? (get(STR.en) ?? path) : v;
  };
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}
export const useLang = () => useContext(LangCtx);
