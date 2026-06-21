import React, { createContext, useContext, useEffect, useState } from 'react';

// Full bilingual dictionary. t('a.b.c') reads STR[lang].a.b.c with English fallback.
export const STR = {
  en: {
    nav: { calc: 'Calculator', explore: 'Explore', city: 'Mission', map: 'Map', world: 'World', ask: 'Ask Bana', langName: 'EN' },
    calc: {
      pill: 'Live Carbon Journey · Grade 6–10', title: 'Build your day, watch your footprint',
      intro: 'Walk through one day of your life. Every choice moves the Eco-Meter in real time, so you can see what helps — then get your full result.',
      pledgeTitle: "Bana's Honesty Pledge", pledgeStamp: 'teacher-reviewed',
      pledgeBody: "Answer truthfully — your teacher can open these results. You can fool the meter, but you can't fool the forest!",
      back: 'Back', next: 'Next scene', reveal: 'Reveal my Eco Score', best: 'Best', perDay: 'kg CO₂/day',
      vsAvg: 'vs Nepal student avg', biggest: 'biggest source', sceneWord: 'scene',
      hint: 'Tip: greener choices glow green and show a lower kg/day. Tap any scene above to jump back.',
      yes: 'Yes', no: 'No',
      level: { tiny: 'Tiny', low: 'Low', medium: 'Medium', high: 'High' },
      steps: {
        transport: { scene: 'Your trip to school', title: 'How do you get to school?', bana: "Namaste! Let's build your day, scene by scene. How do you travel to school — and how far?",
          choices: { walk: 'Walk', bicycle: 'Cycle', public_bus: 'Public Bus', microbus: 'Microbus', motorbike: 'Motorbike', private_car: 'Private Car' }, sliders: { distanceKm: 'Distance one-way' } },
        home: { scene: 'Back home', title: 'Home electricity each day', bana: "Nepal's grid is mostly hydropower, so home power is fairly clean. How many active hours?",
          sliders: { electricityHours: 'Active hours' }, toggles: { hasSolar: 'Solar panels at home?' } },
        cooking: { scene: 'In the kitchen', title: 'What does your family cook with?', bana: 'Cooking fuel is a big one in Nepal. Firewood smoke harms lungs and glaciers; induction and biogas are clean.',
          choices: { firewood: 'Firewood', lpg: 'LPG Gas', electric: 'Induction', mixed: 'LPG + Wood' }, sliders: { lpgKgMonth: 'LPG per month', firewoodKgDay: 'Firewood per day' } },
        food: { scene: 'School lunch', title: 'Your usual lunch?', bana: 'Local, seasonal dal-bhat is low-carbon. Packaged snacks and lots of meat cost the climate more.',
          choices: { dal_bhat_local: 'Dal bhat (local)', packaged_food: 'Packaged food', meat_heavy: 'Meat-heavy', vegetarian_canteen: 'Veg meal' } },
        waste: { scene: 'Throwing it away', title: 'How is waste handled?', bana: 'Composting beats the bin; burning trash is the worst — toxic smoke and black carbon.',
          choices: { compost: 'Compost', municipal_bin: 'Municipal bin', open_burning: 'Burn it', open_dump: 'Open dump' } },
        water: { scene: 'Water use', title: 'Daily family water', bana: 'Clean water takes energy to pump. Rainwater harvesting and quick taps save a lot.',
          sliders: { waterLitresDay: 'Total' }, toggles: { harvestRain: 'Harvest rainwater?' } },
        school: { scene: 'At school', title: 'School electricity use', bana: 'Last few! How heavily does your school use power — fans, labs, projectors, AC?',
          choices: { minimal: 'Minimal', moderate: 'Moderate', heavy: 'Heavy (AC+labs)' } },
        trees: { scene: 'Giving back', title: 'Trees planted & still alive', bana: 'Trees soak up CO₂ — about 20 kg each per year. How many have you helped grow?',
          sliders: { treesCount: 'Trees' } },
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
      treesTitle: 'Trees to go carbon-neutral', treesNeedA: 'You need', treesNeedB: 'more tree(s) growing for a year to offset your footprint.',
      tipsTitle: 'Your top tips \u2014 and what you save', allGood: "You're already doing great across the board \u2014 keep it up and bring a friend along!",
      challenge: "Bana's challenge: try ONE tip this week and tell your class!", thinking: 'Bana is thinking\u2026', unit: 'kg CO\u2082/day',
      score: { champion: 'Eco Champion', greener: 'Getting Greener', room: 'Room to Grow', emergency: 'Climate Emergency' },
    },
    ask: {
      pill: 'Ask Bana · agentic AI', title: 'Chat with Bana',
      intro: "Bana is a local AI (via Ollama) that reads her Nepal climate notebook to help you. Ask anything — or ask for help and she'll plan her steps, ask a few quick questions, and build a plan tailored to you. She remembers your chat.",
      connecting: ' · waking up the local model…', ready: ' · online with memory + RAG', keyword: ' · online (keyword search — pull nomic-embed-text)', local: ' · offline mode — built-in tips (start Ollama for full chat)', offline: ' · offline — start Ollama to chat',
      welcome: "Namaste! I'm Bana. Ask me about your carbon footprint, cooking, transport, trees or waste in Nepal — or tap a starter below.",
      placeholder: 'Ask Bana, or say "help me reduce my footprint"…', placeholderOff: 'Start Ollama to chat with Bana…',
      sources: "From Bana's notebook:", makePlan: 'Make me a plan for this',
      planIntro: "Namaste! I'd love to build a plan that fits your life. Just tap a few answers.",
      ambigIntro: 'Happy to help! A couple of quick questions so my plan fits you.', writingPlan: 'Dhanyabad! Reading my notebook and writing a plan just for you…',
      error: 'Bana wandered into the forest — I could not reach the local model. Make sure Ollama is running (with OLLAMA_ORIGINS set), then try again.',
      offlineHint: 'Bana needs the local AI. Set OLLAMA_ORIGINS=*, restart Ollama, then pull llama3.2 and nomic-embed-text. See the README.',
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
    nav: { calc: 'क्यालकुलेटर', explore: 'अन्वेषण', city: 'मिसन', map: 'नक्सा', world: 'संसार', ask: 'बानालाई सोध्नुहोस्', langName: 'ने' },
    calc: {
      pill: 'प्रत्यक्ष कार्बन यात्रा · कक्षा ६–१०', title: 'आफ्नो दिन बनाउनुहोस्, फुटप्रिन्ट हेर्नुहोस्',
      intro: 'आफ्नो जीवनको एक दिन हिँड्नुहोस्। हरेक छनोटले इको-मिटर तुरुन्तै सार्छ, त्यसैले के मद्दत गर्छ देख्न सक्नुहुन्छ — अनि पूरा नतिजा पाउनुहोस्।',
      pledgeTitle: 'बानाको इमानदारी प्रतिज्ञा', pledgeStamp: 'शिक्षकद्वारा जाँचिने',
      pledgeBody: 'सत्य उत्तर दिनुहोस् — तपाईंको शिक्षकले यो नतिजा हेर्न सक्नुहुन्छ। मिटरलाई छल्न सकिएला, तर जंगललाई छल्न सकिँदैन!',
      back: 'पछाडि', next: 'अर्को दृश्य', reveal: 'मेरो इको स्कोर हेर्नुहोस्', best: 'उत्तम', perDay: 'किलो CO₂/दिन',
      vsAvg: 'नेपाली विद्यार्थी औसतको तुलनामा', biggest: 'सबैभन्दा ठूलो स्रोत', sceneWord: 'दृश्य',
      hint: 'सुझाव: हरित छनोट हरियो हुन्छ र कम किलो/दिन देखाउँछ। माथिको कुनै पनि दृश्यमा फर्कन ट्याप गर्नुहोस्।',
      yes: 'हो', no: 'होइन',
      level: { tiny: 'सानो', low: 'कम', medium: 'मध्यम', high: 'उच्च' },
      steps: {
        transport: { scene: 'स्कुल जाने यात्रा', title: 'तपाईं स्कुल कसरी जानुहुन्छ?', bana: 'नमस्ते! दृश्य-दृश्य गरी दिन बनाऔं। तपाईं स्कुल कसरी जानुहुन्छ — कति टाढा?',
          choices: { walk: 'हिँड्ने', bicycle: 'साइकल', public_bus: 'सार्वजनिक बस', microbus: 'माइक्रोबस', motorbike: 'मोटरसाइकल', private_car: 'निजी कार' }, sliders: { distanceKm: 'एकतर्फी दूरी' } },
        home: { scene: 'घरमा', title: 'दैनिक घरको बिजुली', bana: 'नेपालको ग्रिड प्रायः जलविद्युत हो, त्यसैले घरको बिजुली सफा छ। कति घण्टा सक्रिय?',
          sliders: { electricityHours: 'सक्रिय घण्टा' }, toggles: { hasSolar: 'घरमा सौर्य प्यानल?' } },
        cooking: { scene: 'भान्सामा', title: 'परिवारले केले पकाउँछ?', bana: 'इन्धन नेपालमा ठूलो कुरा हो। दाउराको धुवाँले फोक्सो र हिमाल बिगार्छ; इन्डक्सन र बायोग्यास सफा।',
          choices: { firewood: 'दाउरा', lpg: 'एलपीजी ग्यास', electric: 'इन्डक्सन', mixed: 'ग्यास + दाउरा' }, sliders: { lpgKgMonth: 'मासिक एलपीजी', firewoodKgDay: 'दैनिक दाउरा' } },
        food: { scene: 'स्कुलको खाजा', title: 'सामान्य खाजा?', bana: 'स्थानीय, मौसमी दालभात कम-कार्बन। प्याकेटको खाजा र धेरै मासुले जलवायुलाई बढी असर गर्छ।',
          choices: { dal_bhat_local: 'दालभात (स्थानीय)', packaged_food: 'प्याकेटको खाना', meat_heavy: 'मासुयुक्त', vegetarian_canteen: 'सागसब्जी' } },
        waste: { scene: 'फोहोर फाल्दा', title: 'फोहोर कसरी व्यवस्थापन?', bana: 'कम्पोस्ट डस्टबिनभन्दा राम्रो; फोहोर जलाउनु सबैभन्दा नराम्रो — विषाक्त धुवाँ र कालो कार्बन।',
          choices: { compost: 'कम्पोस्ट', municipal_bin: 'नगर डस्टबिन', open_burning: 'जलाउने', open_dump: 'खुला फाल्ने' } },
        water: { scene: 'पानी प्रयोग', title: 'दैनिक पारिवारिक पानी', bana: 'सफा पानी पम्प गर्न ऊर्जा लाग्छ। वर्षा संकलन र छिटो धाराले धेरै बचाउँछ।',
          sliders: { waterLitresDay: 'कुल' }, toggles: { harvestRain: 'वर्षा संकलन गर्ने?' } },
        school: { scene: 'स्कुलमा', title: 'स्कुलको बिजुली प्रयोग', bana: 'अन्तिम केही! स्कुलले कति बिजुली चलाउँछ — पंखा, ल्याब, प्रोजेक्टर, एसी?',
          choices: { minimal: 'न्यून', moderate: 'मध्यम', heavy: 'उच्च (एसी+ल्याब)' } },
        trees: { scene: 'फिर्ता दिने', title: 'रोपेका र जीवित रूख', bana: 'रूखले CO₂ सोस्छ — प्रत्येकले वर्षको करिब २० किलो। तपाईंले कति हुर्काउनुभयो?',
          sliders: { treesCount: 'रूख' } },
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
      treesTitle: 'कार्बन-तटस्थ हुन रूख', treesNeedA: 'तपाईंलाई', treesNeedB: 'थप रूख वर्षभरि हुर्किनु चाहिन्छ।',
      tipsTitle: 'तपाईंका मुख्य सुझाव — र के बचत', allGood: 'तपाईं सबैतिर राम्रो गरिरहनुभएको छ — यसै राख्नुहोस् र साथी ल्याउनुहोस्!',
      challenge: 'बानाको चुनौती: यो हप्ता एउटा सुझाव गरी कक्षालाई सुनाउनुहोस्!', thinking: 'बाना सोच्दै छिन्…', unit: 'किलो CO\u2082/दिन',
      score: { champion: 'इको च्याम्पियन', greener: 'हरियो हुँदै', room: 'सुधार्ने ठाउँ', emergency: 'जलवायु संकट' },
    },
    ask: {
      pill: 'बानालाई सोध्नुहोस् · एजेन्टिक एआई', title: 'बानासँग कुराकानी',
      intro: 'बाना तपाईंको कम्प्युटरमै (Ollama मार्फत) चल्ने एआई हो, जसले नेपालको जलवायु नोटबुक पढेर सघाउँछ। जे पनि सोध्नुहोस् — वा मद्दत माग्नुहोस्, उसले कदम योजना गर्छ, केही प्रश्न सोध्छ, र तपाईंलाई सुहाउने योजना बनाउँछ। उसले कुराकानी सम्झन्छ।',
      connecting: ' · स्थानीय मोडेल जगाउँदै…', ready: ' · मेमोरी + RAG सहित अनलाइन', keyword: ' · अनलाइन (कीवर्ड खोज — nomic-embed-text तान्नुहोस्)', local: ' · अफलाइन मोड — बिल्ट-इन सुझाव (पूर्ण कुराकानीका लागि Ollama)', offline: ' · अफलाइन — कुराकानीका लागि Ollama सुरु गर्नुहोस्',
      welcome: 'नमस्ते! म बाना हुँ। आफ्नो कार्बन फुटप्रिन्ट, खाना, यातायात, रूख वा फोहोरबारे सोध्नुहोस् — वा तलको सुझाव ट्याप गर्नुहोस्।',
      placeholder: 'बानालाई सोध्नुहोस्, वा "मेरो फुटप्रिन्ट घटाउन मद्दत" भन्नुहोस्…', placeholderOff: 'कुराकानीका लागि Ollama सुरु गर्नुहोस्…',
      sources: 'बानाको नोटबुकबाट:', makePlan: 'यसको लागि योजना बनाइदिनुहोस्',
      planIntro: 'नमस्ते! तपाईंको जीवनसँग मिल्ने योजना बनाउन चाहन्छु। केही उत्तर ट्याप गर्नुहोस्।',
      ambigIntro: 'सघाउन पाउँदा खुसी! मेरो योजना तपाईंलाई सुहाओस् भनेर केही छोटा प्रश्न।', writingPlan: 'धन्यवाद! नोटबुक पढेर तपाईंकै लागि योजना लेख्दै…',
      error: 'बाना जंगलतिर हराइन् — स्थानीय मोडेलसम्म पुग्न सकिनँ। Ollama चलिरहेको (OLLAMA_ORIGINS सेट) सुनिश्चित गरी फेरि प्रयास गर्नुहोस्।',
      offlineHint: 'बानालाई स्थानीय एआई चाहिन्छ। OLLAMA_ORIGINS=* सेट गर्नुहोस्, Ollama पुनः सुरु गर्नुहोस्, अनि llama3.2 र nomic-embed-text तान्नुहोस्। README हेर्नुहोस्।',
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
