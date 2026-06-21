#!/usr/bin/env python3
"""
Bilingual (English + Nepali) source of truth for Bana's RAG knowledge base.
Generates:
  - src/knowledge.js                         (bilingual chunks for the in-app RAG)
  - knowledge/Bana_Knowledge_Base_EN.pdf
  - knowledge/Bana_Knowledge_Base_NE.pdf     (needs a Devanagari font; see below)

Nepali same-language retrieval is used for Nepali queries (best practice for a
low-resource language), so each chunk carries both an English and a Nepali
version with shared keyword tags.

The Nepali PDF needs a Devanagari TrueType font. The script auto-detects common
system fonts (Noto Sans Devanagari, Mangal, Nirmala UI, Kohinoor...). If none is
found it still writes knowledge.js + the English PDF and tells you how to add one:
    python scripts/build_knowledge.py --font /path/to/NotoSansDevanagari.ttf
    # Debian/Ubuntu: sudo apt install fonts-noto-devanagari
Re-run after editing:  python scripts/build_knowledge.py
"""
import json, os, sys, glob

# (id, section_en, title_en, title_ne, tags, text_en, text_ne)
SECTIONS = [
 ("Carbon Footprint Basics", "कार्बन फुटप्रिन्टको आधार", [
  ("what_is_carbon_footprint", "What is a carbon footprint?", "कार्बन फुटप्रिन्ट के हो?",
   "carbon footprint, CO2, meaning, basics, कार्बन, फुटप्रिन्ट",
   "A carbon footprint is the total greenhouse gases your activities release, measured as kilograms of carbon dioxide (CO2). Travel, electricity, cooking fuel, food and waste all add to it. For a Nepali school student the biggest parts are usually transport, cooking fuel and food. You lower it by choosing cleaner options each day.",
   "कार्बन फुटप्रिन्ट भनेको हाम्रा गतिविधिले निकाल्ने कुल हरितगृह ग्यास हो, जुन किलोग्राम कार्बन डाइअक्साइड (CO2) मा नापिन्छ। यातायात, बिजुली, खाना पकाउने इन्धन, खाना र फोहोरले यसमा थप्छ। नेपाली विद्यार्थीको लागि सबैभन्दा ठूलो भाग प्रायः यातायात, इन्धन र खाना हो। हरेक दिन सफा विकल्प रोजेर यो घटाउन सकिन्छ।"),
  ("greenhouse_gases", "Greenhouse gases and units", "हरितगृह ग्यास र एकाइ",
   "greenhouse gas, methane, CH4, CO2, units, मिथेन, एकाइ",
   "Carbon dioxide (CO2) comes from burning petrol, diesel, firewood and LPG. Methane (CH4) comes from livestock, rice paddies and rotting waste, trapping far more heat per kilogram. Footprints are measured in kilograms or tonnes of CO2-equivalent. In Nepal about 54 percent of emissions are methane, mostly from agriculture.",
   "कार्बन डाइअक्साइड (CO2) पेट्रोल, डिजेल, दाउरा र ग्यास बाल्दा निस्कन्छ। मिथेन (CH4) पशुधन, धानखेत र कुहिएको फोहोरबाट आउँछ र प्रति किलोग्राम धेरै बढी ताप समात्छ। फुटप्रिन्ट किलोग्राम वा टन CO2 बराबरमा नापिन्छ। नेपालमा करिब ५४ प्रतिशत उत्सर्जन मिथेन हो, जुन प्रायः कृषिबाट आउँछ।"),
  ("why_nepal_low_but_vulnerable", "Nepal emits little but suffers a lot", "नेपालले थोरै उत्सर्जन गर्छ तर धेरै भोग्छ",
   "Nepal, per capita, vulnerable, climate justice, प्रतिव्यक्ति, जलवायु",
   "Nepal emits little: in 2021 about 1.9 tonnes of CO2 per person, while the global average was about 6.9. Yet Nepal suffers strongly through melting glaciers, floods and erratic monsoons. So Nepali students reduce their footprint not from guilt, but to protect their mountains and rivers and show leadership.",
   "नेपालले थोरै उत्सर्जन गर्छ: सन् २०२१ मा प्रतिव्यक्ति करिब १.९ टन CO2, जबकि विश्व औसत करिब ६.९ थियो। तैपनि हिमाल पग्लने, बाढी र अनियमित मनसुनबाट नेपाल धेरै पीडित छ। त्यसैले नेपाली विद्यार्थीले अपराधबोधले होइन, आफ्ना हिमाल र नदी जोगाउन र नेतृत्व देखाउन फुटप्रिन्ट घटाउँछन्।"),
 ]),
 ("Nepal Climate Context", "नेपालको जलवायु सन्दर्भ", [
  ("nepal_climate_impacts", "How climate change hits Nepal", "जलवायु परिवर्तनले नेपाललाई कसरी असर गर्छ",
   "glaciers, GLOF, Himalaya, monsoon, floods, हिमताल, बाढी, हिमाल",
   "Nepal is warming faster than the global average, especially in the high mountains. Glaciers are shrinking and dangerous glacial lakes are growing; Nepal has recorded about 26 glacial-lake outburst floods. Black carbon (soot) from firewood and diesel settles on snow and speeds melting. Monsoon rain is more erratic, causing floods and landslides.",
   "नेपाल विश्व औसतभन्दा छिटो तातिँदै छ, विशेषगरी उच्च हिमालमा। हिमनदी घट्दै छन् र खतरनाक हिमताल बढ्दै छन्; नेपालमा करिब २६ हिमताल विस्फोट बाढी अभिलेख छन्। दाउरा र डिजेलको कालो कार्बन हिउँमा बसेर पग्लने क्रम तीव्र बनाउँछ। मनसुन झन् अनियमित भई बाढी र पहिरो निम्त्याउँछ।"),
  ("nepal_air_pollution", "Air pollution in Nepal's cities", "नेपालका सहरको वायु प्रदूषण",
   "Kathmandu, air pollution, brick kiln, vehicles, dust, काठमाडौं, प्रदूषण, इँटाभट्टा",
   "Kathmandu Valley traps polluted air because it is a bowl ringed by hills. Main sources are vehicle exhaust, brick kilns, road and construction dust, and open burning of waste and stubble. Transport alone causes around half of Nepal's energy-related CO2. Cleaner transport, no open burning and dust control help the valley breathe.",
   "काठमाडौं उपत्यका पहाडले घेरिएको बटुको जस्तो भएकाले प्रदूषित हावा थुनिन्छ। मुख्य स्रोत सवारीको धुवाँ, इँटाभट्टा, सडक र निर्माणको धुलो, अनि फोहोर र पराल जलाउनु हो। यातायातले मात्रै नेपालको ऊर्जा-सम्बन्धी CO2 को करिब आधा निकाल्छ। सफा यातायात, खुला जलन रोक्नु र धुलो नियन्त्रणले उपत्यकालाई सास फेर्न मद्दत गर्छ।"),
  ("nepal_targets", "Nepal's climate goals", "नेपालका जलवायु लक्ष्य",
   "net zero 2045, NDC, forest cover, clean cooking, नेट जिरो, वन, लक्ष्य",
   "Nepal has promised net-zero carbon emissions by 2045 and to keep at least 45 percent of the country under forest. Its plan aims for many more electric vehicles and for 25 percent of households to use electric stoves as their main cooking method by 2030, plus many improved cookstoves and biogas plants.",
   "नेपालले सन् २०४५ सम्म नेट-जिरो कार्बन उत्सर्जन र देशको कम्तीमा ४५ प्रतिशत भूभाग वनमुनि राख्ने प्रतिबद्धता गरेको छ। यसको योजनाले धेरै विद्युतीय सवारी र सन् २०३० सम्म २५ प्रतिशत घरधुरीले विद्युतीय चुलोलाई मुख्य खाना पकाउने माध्यम बनाउने लक्ष्य राख्छ, साथै धेरै सुधारिएका चुलो र बायोग्यास प्लान्ट।"),
  ("nepal_clean_electricity", "Why Nepal's electricity is clean", "नेपालको बिजुली किन सफा छ",
   "hydropower, electricity, renewable, grid, जलविद्युत, बिजुली, नवीकरणीय",
   "Almost all of Nepal's grid electricity comes from hydropower, so it is nearly 100 percent renewable and low-carbon. About 98 percent of people have electricity, and in the wet season Nepal has surplus power and exports some to Bangladesh. So switching from fuel (firewood, LPG, petrol) to grid electricity usually cuts your footprint.",
   "नेपालको ग्रिडको झन्डै सबै बिजुली जलविद्युतबाट आउँछ, त्यसैले यो करिब शतप्रतिशत नवीकरणीय र कम-कार्बन हो। करिब ९८ प्रतिशत मानिससँग बिजुली छ, र वर्षायाममा नेपालसँग बढी बिजुली भई बंगलादेशसम्म निर्यात हुन्छ। त्यसैले इन्धन (दाउरा, ग्यास, पेट्रोल) बाट ग्रिड बिजुलीमा सर्दा प्रायः फुटप्रिन्ट घट्छ।"),
 ]),
 ("Transport", "यातायात", [
  ("transport_overview", "Transport is Nepal's biggest energy emitter", "यातायात नेपालको सबैभन्दा ठूलो ऊर्जा उत्सर्जक",
   "transport, petrol, diesel, petroleum, यातायात, पेट्रोल, डिजेल",
   "Burning petrol and diesel causes about half of Nepal's energy-related CO2, and petroleum is one of the largest, costliest imports. Each litre of petrol burned makes about 2.3 kg of CO2. So how you travel is often the single biggest lever a student has. Feet, a cycle, shared rides or public transport beat a private motorbike or car.",
   "पेट्रोल र डिजेल बाल्दा नेपालको ऊर्जा-सम्बन्धी CO2 को करिब आधा निस्कन्छ, र पेट्रोलियम सबैभन्दा ठूलो र महँगो आयात मध्ये एक हो। प्रति लिटर पेट्रोलले करिब २.३ किलो CO2 बनाउँछ। त्यसैले तपाईं कसरी यात्रा गर्नुहुन्छ भन्ने नै ठूलो कुरा हो। हिँड्नु, साइकल, साझा यात्रा वा सार्वजनिक यातायात निजी मोटरसाइकल वा कारभन्दा राम्रो।"),
  ("transport_options_ranked", "Cleanest to dirtiest ways to travel", "सफादेखि प्रदूषित यात्राका तरिका",
   "walk, cycle, bus, microbus, Sajha, motorbike, car, हिँड्ने, साइकल, बस",
   "Cleanest to most polluting for a student: walking and cycling are zero-emission and healthy; a shared public bus or microbus (like Sajha Yatayat) spreads its fuel over many riders, so per-person share is small; a motorbike is worse per person; a private car with one student is the most polluting. Sharing any vehicle lowers the footprint per person.",
   "विद्यार्थीका लागि सफादेखि प्रदूषितसम्म: हिँड्ने र साइकल शून्य-उत्सर्जन र स्वस्थ; साझा सार्वजनिक बस वा माइक्रोबस (जस्तै साझा यातायात) धेरै यात्रुमा इन्धन बाँड्छ, त्यसैले प्रतिव्यक्ति हिस्सा थोरै; मोटरसाइकल प्रतिव्यक्ति झन् नराम्रो; एक्लै चढेको निजी कार सबैभन्दा प्रदूषित। कुनै पनि सवारी साझा गर्दा प्रतिव्यक्ति फुटप्रिन्ट घट्छ।"),
  ("ev_in_nepal", "Electric vehicles in Nepal", "नेपालमा विद्युतीय सवारी",
   "EV, electric vehicle, hydropower, charging, विद्युतीय सवारी, चार्जिङ",
   "Nepal is a world leader in EV adoption: in 2024/25 EVs were about 73 percent of four-wheeler passenger imports, helped by low EV taxes. Because the grid is hydropower, an EV runs on clean energy with a low footprint. There are around 750 charging stations, Kathmandu uses electric garbage trucks, and Bagmati requires new taxis to be electric.",
   "नेपाल विद्युतीय सवारी अपनाउनमा विश्वमै अग्रणी छ: सन् २०२४/२५ मा EV चारपांग्रे यात्रु आयातको करिब ७३ प्रतिशत थियो, कम करले मद्दत गर्‍यो। ग्रिड जलविद्युत भएकाले EV सफा ऊर्जामा चल्छ र फुटप्रिन्ट कम हुन्छ। करिब ७५० चार्जिङ स्टेसन छन्, काठमाडौंमा विद्युतीय फोहोर ट्रक चल्छन्, र बागमतीमा नयाँ ट्याक्सी विद्युतीय हुनुपर्ने नियम छ।"),
  ("transport_tips_student", "Travel tips for students", "विद्यार्थीका लागि यात्रा सुझाव",
   "school commute, walk, cycle, share, स्कुल, हिँड्ने, साझा",
   "Walk or cycle for trips under 2-3 km: free, healthy and zero-carbon. For longer trips take a public bus or microbus instead of a private vehicle, and share rides with classmates nearby. Combine errands into one trip. Ask family about an electric scooter or electric public transport. Keeping tyres pumped and engines serviced saves fuel too.",
   "२-३ किमीभन्दा छोटो यात्रामा हिँड्नुहोस् वा साइकल चलाउनुहोस्: निःशुल्क, स्वस्थ र शून्य-कार्बन। लामो यात्रामा निजी सवारीको साटो सार्वजनिक बस वा माइक्रो चढ्नुहोस् र नजिकका साथीसँग साझा गर्नुहोस्। काम एकैपटक मिलाउनुहोस्। परिवारलाई विद्युतीय स्कुटर वा विद्युतीय सार्वजनिक यातायातबारे सुझाव दिनुहोस्। टायरमा हावा र इन्जिन सर्भिसले पनि इन्धन बचाउँछ।"),
 ]),
 ("Home Energy", "घरको ऊर्जा", [
  ("home_electricity_clean", "Using clean grid electricity wisely", "सफा ग्रिड बिजुली बुद्धिमानीसँग",
   "electricity, hydropower, energy saving, home, बिजुली, ऊर्जा बचत",
   "Because Nepal's electricity is hydropower, using grid power for light, fans, study and cooking is already low-carbon. Switching a home from firewood or LPG to electric usually cuts the footprint. Still, save energy: power you don't waste can run someone else's induction stove or an electric bus, and it lowers your bill and eases the dry-season grid.",
   "नेपालको बिजुली जलविद्युत भएकाले बत्ती, पंखा, पढाइ र खाना पकाउन ग्रिड बिजुली प्रयोग गर्दा पहिल्यै कम-कार्बन हुन्छ। घरलाई दाउरा वा ग्यासबाट विद्युतीयमा सार्दा प्रायः फुटप्रिन्ट घट्छ। तैपनि ऊर्जा बचाउनुहोस्: नखेर गएको बिजुलीले अरूको इन्डक्सन चुलो वा विद्युतीय बस चलाउन सक्छ, बिल घटाउँछ र सुक्खायाममा ग्रिडलाई सहज बनाउँछ।"),
  ("energy_saving_tips", "Easy ways to save energy at home", "घरमा ऊर्जा बचाउने सजिला उपाय",
   "LED, lights, fans, unplug, natural light, एलईडी, बत्ती, पंखा",
   "Switch to LED bulbs (up to 80 percent less power). Turn off lights, fans and the TV when you leave a room, and unplug chargers that sip standby power. Study near a window for daylight. Use a fan instead of air-conditioning. Dry clothes in the sun. These habits cost nothing and free up clean power for everyone.",
   "एलईडी बल्बमा सर्नुहोस् (८० प्रतिशतसम्म कम बिजुली)। कोठा छोड्दा बत्ती, पंखा र टिभी निभाउनुहोस्, र स्ट्यान्डबाई खपत गर्ने चार्जर निकाल्नुहोस्। झ्यालनेर बसेर दिनको उज्यालोमा पढ्नुहोस्। एसीको साटो पंखा चलाउनुहोस्। लुगा घाममा सुकाउनुहोस्। यी बानीले केही खर्च हुँदैन र सबैका लागि सफा बिजुली बचाउँछ।"),
  ("solar_in_nepal", "Solar power for homes and schools", "घर र स्कुलका लागि सौर्य ऊर्जा",
   "solar, rooftop, solar lantern, sun, सौर्य, छत, सूर्य",
   "Nepal gets sunshine on about 300 days a year, so rooftop solar panels and solar water heaters work well, especially where the grid is weak. A small solar panel and a rechargeable solar lantern give clean study light without kerosene smoke. Encourage your school to put solar panels on its roof; it makes clean power on-site and is a great eco-club project.",
   "नेपालमा वर्षको करिब ३०० दिन घाम लाग्छ, त्यसैले छतमा सौर्य प्यानल र सौर्य पानी तताउने राम्रो काम गर्छ, खासगरी ग्रिड कमजोर ठाउँमा। सानो सौर्य प्यानल र रिचार्ज हुने सौर्य लाल्टिनले मट्टितेलको धुवाँबिना सफा पढाइ-बत्ती दिन्छ। आफ्नो स्कुलको छतमा सौर्य प्यानल राख्न प्रोत्साहन गर्नुहोस्।"),
 ]),
 ("Cooking Fuel", "खाना पकाउने इन्धन", [
  ("cooking_fuels_overview", "Choosing a cleaner cooking fuel", "सफा इन्धन छनोट",
   "cooking, firewood, LPG, biogas, induction, दाउरा, ग्यास, इन्डक्सन",
   "Cooking fuel is a big part of a household's footprint. Cleanest to dirtiest for climate and lungs: an electric induction stove (on hydropower) is best; biogas from animal or kitchen waste is very good; LPG gas is cleaner than wood; open firewood is the most harmful. Moving even one or two meals a day to induction or biogas makes a real difference.",
   "खाना पकाउने इन्धन घरको फुटप्रिन्टको ठूलो भाग हो। जलवायु र फोक्सोका लागि सफादेखि नराम्रोसम्म: इन्डक्सन चुलो (जलविद्युतमा) सबैभन्दा राम्रो; पशु वा भान्साको फोहोरबाट बनेको बायोग्यास धेरै राम्रो; ग्यास दाउराभन्दा सफा; खुला दाउरा सबैभन्दा हानिकारक। दिनको एक-दुई छाक मात्रै इन्डक्सन वा बायोग्यासमा सारे पनि ठूलो फरक पर्छ।"),
  ("firewood_problem", "Why firewood is harmful", "दाउरा किन हानिकारक",
   "firewood, deforestation, indoor smoke, black carbon, दाउरा, धुवाँ, वन विनाश",
   "Open firewood cuts forests, fills kitchens with smoke that harms eyes and lungs (especially mothers and children), and releases black carbon that lands on Himalayan snow and speeds melting. An improved cookstove burns wood far more efficiently and vents smoke outside, while induction or biogas removes smoke entirely. Reducing firewood protects health and the mountains.",
   "खुला दाउराले वन नष्ट गर्छ, भान्सामा धुवाँ भरेर आँखा र फोक्सो (खासगरी आमा र बालबालिका) लाई हानि गर्छ, र कालो कार्बन निकालेर हिमालको हिउँमा बसी पग्लने क्रम बढाउँछ। सुधारिएको चुलोले दाउरा धेरै कुशलतापूर्वक बाल्छ र धुवाँ बाहिर पठाउँछ, इन्डक्सन वा बायोग्यासले धुवाँ पूरै हटाउँछ। दाउरा घटाउँदा स्वास्थ्य र हिमाल जोगिन्छ।"),
  ("clean_cooking_nepal", "Clean cooking options in Nepal", "नेपालमा सफा खाना पकाउने विकल्प",
   "induction, biogas, improved cookstove, NDC, इन्डक्सन, बायोग्यास, सुधारिएको चुलो",
   "Nepal aims for a quarter of households to cook mainly with electricity by 2030, plus many biogas plants and improved cookstoves. Because the grid is hydropower, an induction stove is clean and cheap to run. Biogas turns cow dung and kitchen scraps into cooking gas and leaves good fertiliser, perfect for Terai and hill farms. An improved cookstove is a low-cost first step.",
   "नेपालले सन् २०३० सम्म चौथाइ घरधुरीले मुख्यतः बिजुलीले खाना पकाउने, साथै धेरै बायोग्यास र सुधारिएका चुलोको लक्ष्य राखेको छ। ग्रिड जलविद्युत भएकाले इन्डक्सन चुलो सफा र सस्तो हुन्छ। बायोग्यासले गोबर र भान्साको फोहोरलाई खाना पकाउने ग्यास बनाउँछ र राम्रो मल छोड्छ, जुन तराई र पहाडका खेतका लागि उत्तम। सुधारिएको चुलो सस्तो पहिलो पाइला हो।"),
 ]),
 ("Food", "खाना", [
  ("food_footprint_basics", "Food and your footprint", "खाना र फुटप्रिन्ट",
   "food, footprint, local, seasonal, packaged, खाना, स्थानीय, मौसमी",
   "Food can be a quarter of a person's footprint. Locally grown, seasonal, plant-based meals are low-carbon, while meat, dairy and packaged or imported foods are higher due to methane, processing and long transport. For a Nepali student, eating fresh local food and cutting packaged snacks is an easy, tasty win.",
   "खाना मानिसको फुटप्रिन्टको चौथाइसम्म हुन सक्छ। स्थानीय, मौसमी, वनस्पतिमुखी खाना कम-कार्बन हुन्छ, जबकि मासु, दुग्ध र प्याकेज्ड वा आयातित खाना मिथेन, प्रशोधन र लामो ढुवानीका कारण बढी हुन्छ। नेपाली विद्यार्थीका लागि ताजा स्थानीय खाना खानु र प्याकेज्ड खाजा घटाउनु सजिलो र मीठो जित हो।"),
  ("dal_bhat_local", "Dal bhat and local food", "दालभात र स्थानीय खाना",
   "dal bhat, local, seasonal, packaged snacks, दालभात, स्थानीय, खाजा",
   "A simple dal-bhat-tarkari from local, seasonal vegetables and lentils is low-carbon and healthy. Packaged noodles, chips, soft drinks and imported snacks have a much higher footprint from processing, packaging and long transport. Choosing local seasonal produce and home food over packaged snacks cuts both carbon and plastic.",
   "स्थानीय, मौसमी तरकारी र दालबाट बनेको साधारण दालभात-तरकारी कम-कार्बन र स्वस्थ हुन्छ। प्याकेटका चाउचाउ, चिप्स, कोल्ड्रिंक र आयातित खाजाको फुटप्रिन्ट प्रशोधन, प्याकेजिङ र लामो ढुवानीले धेरै बढी हुन्छ। प्याकेज्ड खाजाको साटो स्थानीय मौसमी उपज र घरको खाना रोज्दा कार्बन र प्लास्टिक दुवै घट्छ।"),
  ("meat_and_dairy", "Meat, dairy and methane", "मासु, दुग्ध र मिथेन",
   "meat, buff, chicken, goat, dairy, methane, मासु, कुखुरा, मिथेन",
   "Buffalo, cows and goats burp methane, a powerful greenhouse gas, and need much land and feed. You need not stop meat, but having it fewer times a week and in smaller portions lowers your footprint. Plant proteins common in Nepal — dal (lentils), beans, soybean and gundruk with rice — are filling, cheap and low-carbon.",
   "भैंसी, गाई र बाख्राले मिथेन निकाल्छन्, जुन शक्तिशाली हरितगृह ग्यास हो, र धेरै जग्गा र दाना चाहिन्छ। मासु पूरै छोड्नुपर्दैन, तर हप्तामा कम पटक र सानो परिमाणमा खाँदा फुटप्रिन्ट घट्छ। नेपालमा सामान्य वनस्पति प्रोटिन — दाल, सिमी, भटमास र गुन्द्रुकसँग भात — पेट भरिने, सस्तो र कम-कार्बन हुन्छ।"),
  ("food_waste", "Cut food waste, cut methane", "खाना खेर नफाल, मिथेन घटाऊ",
   "food waste, compost, methane, portions, खाना खेर, कम्पोस्ट, मिथेन",
   "When food rots in a dump it releases methane. Take only what you will eat, store leftovers and share extra food. Peels and scraps should be composted, not thrown in mixed waste. Since a large share of Nepal's emissions is methane, reducing food waste and composting scraps is one of the most effective household actions.",
   "खाना डम्पिङमा कुहिँदा मिथेन निस्कन्छ। खाने जति मात्र लिनुहोस्, बाँकी जोगाउनुहोस् र बाँड्नुहोस्। बोक्रा र टुक्रा मिश्रित फोहोरमा नफालेर कम्पोस्ट बनाउनुहोस्। नेपालको ठूलो हिस्सा उत्सर्जन मिथेन भएकाले खाना खेर नफाल्नु र कम्पोस्ट बनाउनु सबैभन्दा प्रभावकारी घरेलु कदम मध्ये एक हो।"),
  ("kitchen_garden", "Grow a kitchen garden", "करेसाबारी लगाऊ",
   "kitchen garden, karesabari, vegetables, school garden, करेसाबारी, तरकारी",
   "A home or school kitchen garden (karesabari) means food travels almost no distance, needs no packaging, and scraps compost right there. Herbs, greens, tomatoes and beans grow well in pots or small plots across Nepal. A school vegetable garden is a fun eco-club project that teaches where low-carbon food comes from.",
   "घर वा स्कुलको करेसाबारीले खाना झन्डै कतै ढुवानी नगरी, प्याकेजिङबिना उम्रन्छ र टुक्रा त्यहीँ कम्पोस्ट हुन्छ। जडीबुटी, साग, गोलभेँडा र सिमी नेपालभरि गमला वा सानो टुक्रामा राम्रो फल्छ। स्कुल तरकारी बगैंचा रमाइलो इको-क्लब परियोजना हो जसले कम-कार्बन खाना कहाँबाट आउँछ भनी सिकाउँछ।"),
 ]),
 ("Waste", "फोहोर", [
  ("waste_overview", "Managing waste in Nepal", "नेपालमा फोहोर व्यवस्थापन",
   "waste, segregation, organic, recyclable, फोहोर, छुट्याउने, जैविक",
   "Separate waste into wet (organic) and dry (recyclable) at home and school. Nepal's Solid Waste Management Act (2011) supports proper management, but enforcement is weak, so personal habits matter. Some Kathmandu municipalities use electric garbage trucks. Segregating lets organic matter become compost and paper, glass and metal be recycled instead of dumped or burned.",
   "घर र स्कुलमा फोहोर ओसिलो (जैविक) र सुक्खा (पुनःप्रयोगयोग्य) मा छुट्याउनुहोस्। नेपालको ठोस फोहोर व्यवस्थापन ऐन (२०११) ले उचित व्यवस्थापनलाई समर्थन गर्छ, तर कार्यान्वयन कमजोर छ, त्यसैले व्यक्तिगत बानी महत्त्वपूर्ण छ। काठमाडौंका केही नगरपालिकाले विद्युतीय फोहोर ट्रक चलाउँछन्। छुट्याउँदा जैविक पदार्थ कम्पोस्ट र कागज, सिसा, धातु पुनःप्रयोग हुन्छ।"),
  ("composting", "Composting organic waste", "जैविक फोहोरको कम्पोस्ट",
   "compost, organic, methane, fertiliser, कम्पोस्ट, मल, मिथेन",
   "Composting turns kitchen scraps, peels and garden trimmings into rich fertiliser instead of sending them to a dump where they release methane. A simple compost pit or bin in the yard, or a school compost corner, does the job. The finished compost feeds a kitchen garden, closing the loop — one of the cheapest, highest-impact climate actions.",
   "कम्पोस्टले भान्साको टुक्रा, बोक्रा र बगैंचाको पात-पतिङ्गरलाई डम्पिङमा पठाएर मिथेन निकाल्नुको साटो राम्रो मल बनाउँछ। आँगनको सानो कम्पोस्ट खाडल वा भाँडो, वा स्कुलको कम्पोस्ट कुना यथेष्ट हुन्छ। तयार कम्पोस्टले करेसाबारी पोस्छ — सस्तो र उच्च-प्रभावकारी जलवायु कदम मध्ये एक।"),
  ("plastic_reduction", "Reducing plastic", "प्लास्टिक घटाउने",
   "plastic, single-use, cloth bag, refill, प्लास्टिक, कपडाको झोला",
   "Carry a cloth or jute bag and refuse free plastic bags, which Kathmandu Valley has tried to ban. Use a refillable steel water bottle instead of plastic bottles. Choose less packaging and reuse containers. Plastic is often burned or dumped in Nepal because recycling is limited, so avoiding single-use plastic is the best step.",
   "कपडा वा जुटको झोला बोक्नुहोस् र निःशुल्क प्लास्टिक झोला अस्वीकार गर्नुहोस्, जसलाई काठमाडौं उपत्यकाले प्रतिबन्ध गर्ने प्रयास गरेको छ। प्लास्टिक बोतलको साटो रिफिल हुने स्टिल बोतल प्रयोग गर्नुहोस्। कम प्याकेजिङ रोज्नुहोस् र भाँडा पुनःप्रयोग गर्नुहोस्। नेपालमा पुनःप्रयोग सीमित भएकाले प्लास्टिक प्रायः जलाइन्छ वा फालिन्छ, त्यसैले एकपटक प्रयोग हुने प्लास्टिक नै नकिन्नु उत्तम।"),
  ("avoid_open_burning", "Never burn your trash", "फोहोर कहिल्यै नजलाऊ",
   "open burning, black carbon, toxic smoke, stubble, जलन, कालो कार्बन, पराल",
   "Burning rubbish or crop stubble releases toxic smoke and black carbon that pollutes the air and darkens Himalayan snow, speeding melting. It is one of the worst things for health and climate. Instead, compost organic waste, recycle dry waste, and hand the rest to municipal collection. Encourage neighbours and farmers not to burn.",
   "फोहोर वा बालीको पराल जलाउँदा विषाक्त धुवाँ र कालो कार्बन निस्कन्छ जसले हावा प्रदूषित गर्छ र हिमालको हिउँ कालो बनाएर पग्लने क्रम बढाउँछ। यो स्वास्थ्य र जलवायुका लागि सबैभन्दा हानिकारक मध्ये एक हो। बरु जैविक फोहोर कम्पोस्ट गर्नुहोस्, सुक्खा फोहोर पुनःप्रयोग गर्नुहोस्, बाँकी नगरपालिकालाई दिनुहोस्। छिमेकी र किसानलाई नजलाउन प्रोत्साहन गर्नुहोस्।"),
 ]),
 ("Water and Forests", "पानी र वन", [
  ("water_conservation", "Saving water", "पानी बचाउने",
   "water, conservation, rainwater harvesting, leaks, पानी, वर्षा संकलन",
   "Treating and pumping water uses energy, and clean water is precious in much of Nepal. Turn off taps while brushing, fix drips, and reuse vegetable-washing water for plants. A simple rooftop rainwater-harvesting tank stores monsoon rain for dry months and reduces pumping. A bucket and mug save a surprising amount.",
   "पानी प्रशोधन र पम्प गर्न ऊर्जा लाग्छ, र नेपालको धेरै ठाउँमा सफा पानी बहुमूल्य छ। दाँत माझ्दा धारा बन्द गर्नुहोस्, चुहावट मर्मत गर्नुहोस्, र तरकारी धोएको पानी बिरुवामा प्रयोग गर्नुहोस्। छतको सानो वर्षा-संकलन ट्यांकीले मनसुनको पानी सुक्खा महिनाका लागि जम्मा गर्छ र पम्पिङ घटाउँछ। बाल्टिन र लोटाले धेरै पानी बचाउँछ।"),
  ("trees_carbon_sink", "Trees absorb carbon", "रूखले कार्बन सोस्छ",
   "trees, carbon sink, native species, sal, utis, रूख, सालका, स्वदेशी",
   "A growing tree pulls CO2 from the air; a healthy tree can absorb roughly 20 kg of CO2 a year. Native Nepali species such as sal, utis (alder), oak (kharsu) and rhododendron (lali gurans) suit local conditions and support birds and bees. Planting and caring for trees until well established is a powerful, lasting climate action.",
   "बढ्दो रूखले हावाबाट CO2 तान्छ; स्वस्थ रूखले वर्षको करिब २० किलो CO2 सोस्न सक्छ। साल, उत्तिस, खर्सु (फलाँट) र लालीगुराँस जस्ता स्वदेशी प्रजाति स्थानीय हावापानी सुहाउँछन् र चरा-माहुरीलाई सघाउँछन्। रूख रोपेर राम्ररी हुर्किन्जेल हेरचाह गर्नु शक्तिशाली, दिगो जलवायु कदम हो।"),
  ("community_forestry_nepal", "Nepal's famous community forests", "नेपालको प्रसिद्ध सामुदायिक वन",
   "community forestry, forest user group, restoration, सामुदायिक वन, उपभोक्ता समूह",
   "Nepal's community-forestry programme is admired worldwide: local community forest user groups protect and manage nearby forests, helping raise forest cover back to around 45 percent. Joining or supporting a community forest, helping with plantation days, and preventing forest fires all strengthen this natural carbon sink and show how ordinary people can heal the land.",
   "नेपालको सामुदायिक वन कार्यक्रम विश्वभर प्रशंसित छ: स्थानीय सामुदायिक वन उपभोक्ता समूहले नजिकका वन संरक्षण र व्यवस्थापन गर्छन्, जसले वन क्षेत्र करिब ४५ प्रतिशतसम्म फर्काउन सघायो। सामुदायिक वनमा सहभागी हुनु, वृक्षारोपणमा सघाउनु र डढेलो रोक्नुले यो प्राकृतिक कार्बन भण्डार बलियो बनाउँछ।"),
 ]),
 ("Taking Action", "कदम चाल्ने", [
  ("smart_goals", "Set a SMART eco goal", "स्मार्ट हरित लक्ष्य राख",
   "SMART goal, plan, weekly, habit, स्मार्ट लक्ष्य, योजना, बानी",
   "Make your climate goal SMART: Specific, Measurable, Achievable, Relevant, Time-bound. Instead of 'I will save the planet', try 'This week I will walk to school three days.' Pick one small action, do it for a week, then add another. Small steady habits beat big promises. Track your wins to stay motivated.",
   "आफ्नो जलवायु लक्ष्य स्मार्ट बनाउनुहोस्: स्पष्ट, नापिने, सम्भव, सान्दर्भिक, समयबद्ध। 'म पृथ्वी बचाउँछु' को साटो 'यो हप्ता म तीन दिन स्कुल हिँडेर जान्छु' भन्नुहोस्। एउटा सानो काम छान्नुहोस्, हप्ता भर गर्नुहोस्, अनि अर्को थप्नुहोस्। साना नियमित बानी ठूला वाचाभन्दा राम्रा। प्रेरित रहन आफ्ना जित टिप्नुहोस्।"),
  ("school_actions", "Climate action at school", "स्कुलमा जलवायु कदम",
   "eco club, school, tree planting, segregation, इको क्लब, स्कुल, वृक्षारोपण",
   "Schools multiply your impact. Start or join an eco-club, organise a tree-planting and tree-care day, set up waste-segregation and compost corners, switch the school to LED lights, and run awareness skits or poster days. Ask about solar panels for the roof. A class-versus-class green challenge makes saving carbon fun.",
   "स्कुलले तपाईंको प्रभाव बढाउँछ। इको-क्लब सुरु गर्नुहोस् वा सामेल हुनुहोस्, वृक्षारोपण र रूख हेरचाह दिवस आयोजना गर्नुहोस्, फोहोर छुट्याउने र कम्पोस्ट कुना बनाउनुहोस्, स्कुललाई एलईडी बत्तीमा सार्नुहोस्, र जनचेतना नाटक वा पोस्टर दिवस गर्नुहोस्। छतमा सौर्य प्यानलबारे सोध्नुहोस्। कक्षा-बनाम-कक्षा हरित प्रतिस्पर्धाले कार्बन बचाउन रमाइलो बनाउँछ।"),
  ("advocacy_family", "Lead at home and with friends", "घर र साथीसँग नेतृत्व",
   "family, advocacy, role model, friends, परिवार, साथी, उदाहरण",
   "You influence more people than you think. Explain to family why you switch off lights, carry a cloth bag or want induction cooking, and lead by example rather than lecturing. Share one tip with a friend each week. When young people act kindly and consistently, parents, shopkeepers and neighbours often follow.",
   "तपाईंले सोचेभन्दा धेरै मानिसलाई प्रभाव पार्नुहुन्छ। परिवारलाई किन बत्ती निभाउनुहुन्छ, कपडाको झोला बोक्नुहुन्छ वा इन्डक्सन चाहनुहुन्छ भनी बुझाउनुहोस्, र भाषणभन्दा उदाहरणले नेतृत्व गर्नुहोस्। हरेक हप्ता एक साथीलाई एउटा सुझाव बाँड्नुहोस्। युवाले मायालु र निरन्तर काम गर्दा अभिभावक, पसले र छिमेकी प्रायः पछ्याउँछन्।"),
  ("measure_and_track", "Measure, then improve", "नाप, अनि सुधार",
   "measure, track, calculator, progress, नाप, क्यालकुलेटर, प्रगति",
   "You cannot improve what you do not measure. Use a carbon-footprint calculator to find your biggest source, set one goal to shrink it, then re-check after a few weeks. Celebrate small drops and share them with your class. Tracking turns a vague wish into visible, motivating results.",
   "जे नापिँदैन त्यो सुधार्न सकिँदैन। कार्बन फुटप्रिन्ट क्यालकुलेटरले आफ्नो सबैभन्दा ठूलो स्रोत पत्ता लगाउनुहोस्, त्यो घटाउने एउटा लक्ष्य राख्नुहोस्, अनि केही हप्तापछि पुनः जाँच्नुहोस्। साना कमी मनाउनुहोस् र कक्षासँग बाँड्नुहोस्। नापजोखले अस्पष्ट चाहनालाई देखिने, प्रेरक नतिजामा बदल्छ।"),
  ("savings_reference", "How much do actions save?", "कुन कामले कति बचाउँछ?",
   "savings, numbers, kg CO2, reference, बचत, किलो",
   "Rough savings: each litre of petrol not burned saves about 2.3 kg CO2; walking or cycling a 2 km school trip instead of a motorbike saves roughly 0.5 kg each way; moving a meal from firewood or LPG to induction cuts smoke and carbon daily; composting and avoiding open burning cut methane and black carbon; one well-cared tree absorbs about 20 kg CO2 a year.",
   "अनुमानित बचत: नबालिएको प्रति लिटर पेट्रोलले करिब २.३ किलो CO2 बचाउँछ; मोटरसाइकलको साटो २ किमी स्कुल यात्रा हिँडेर वा साइकलले प्रत्येक तर्फ करिब ०.५ किलो बचाउँछ; एक छाक दाउरा/ग्यासबाट इन्डक्सनमा सार्दा दैनिक धुवाँ र कार्बन घट्छ; कम्पोस्ट र खुला जलन नगर्दा मिथेन र कालो कार्बन घट्छ; राम्ररी हेरचाह गरेको एक रूखले वर्षको करिब २० किलो CO2 सोस्छ।"),
 ]),
 ("Common Questions", "सामान्य प्रश्न", [
  ("qa_reduce_footprint", "Q: How can I reduce my carbon footprint?", "प्रश्न: म आफ्नो कार्बन फुटप्रिन्ट कसरी घटाउँ?",
   "reduce footprint, how, student, plan, घटाउने, कसरी, योजना",
   "Start with your biggest source — for most students that is transport, so walk or cycle short trips and take a bus or shared ride for longer ones. Next, push for cleaner cooking (induction on hydropower, or biogas) and eat local seasonal food with less packaging and less meat. Segregate and compost waste, never burn trash, save power and water, and plant a native tree. Pick one habit, do it a week, then add another.",
   "आफ्नो सबैभन्दा ठूलो स्रोतबाट सुरु गर्नुहोस् — धेरै विद्यार्थीका लागि त्यो यातायात हो, त्यसैले छोटो यात्रा हिँड्नुहोस् वा साइकल चलाउनुहोस्, लामोमा बस वा साझा यात्रा। त्यसपछि सफा खाना पकाइ (जलविद्युतमा इन्डक्सन वा बायोग्यास) अपनाउनुहोस् र कम प्याकेजिङ, कम मासुसहित स्थानीय मौसमी खाना खानुहोस्। फोहोर छुट्याउनुहोस् र कम्पोस्ट गर्नुहोस्, कहिल्यै नजलाउनुहोस्, बिजुली-पानी बचाउनुहोस्, र स्वदेशी रूख रोप्नुहोस्। एउटा बानी छान्नुहोस्, हप्ता भर गर्नुहोस्, अनि अर्को थप्नुहोस्।"),
  ("qa_is_electricity_clean", "Q: Is electricity clean in Nepal?", "प्रश्न: नेपालमा बिजुली सफा छ?",
   "electricity clean, hydropower, बिजुली सफा, जलविद्युत",
   "Yes. Nearly all of Nepal's grid electricity comes from hydropower, so it is low-carbon and renewable. That is why switching from firewood, LPG or petrol to electric options (induction stoves, electric vehicles) usually lowers your footprint. The main thing is to avoid wasting electricity, especially in the dry season when rivers are lower.",
   "हो। नेपालको ग्रिडको झन्डै सबै बिजुली जलविद्युतबाट आउँछ, त्यसैले यो कम-कार्बन र नवीकरणीय छ। यसैकारण दाउरा, ग्यास वा पेट्रोलबाट विद्युतीय विकल्प (इन्डक्सन चुलो, विद्युतीय सवारी) मा सर्दा प्रायः फुटप्रिन्ट घट्छ। मुख्य कुरा बिजुली खेर नफाल्नु हो, खासगरी नदी घट्ने सुक्खायाममा।"),
  ("qa_why_firewood_bad", "Q: Why is cooking on firewood bad?", "प्रश्न: दाउरामा पकाउनु किन नराम्रो?",
   "firewood bad, smoke, deforestation, दाउरा नराम्रो, धुवाँ",
   "Open firewood harms forests, fills the kitchen with harmful smoke, and produces black carbon that settles on Himalayan glaciers and speeds melting. Switching to an improved cookstove, biogas or an electric induction stove protects your family's health and the mountains.",
   "खुला दाउराले वन नष्ट गर्छ, भान्सामा हानिकारक धुवाँ भर्छ, र कालो कार्बन उत्पादन गर्छ जुन हिमालका हिमनदीमा बसी पग्लने क्रम बढाउँछ। सुधारिएको चुलो, बायोग्यास वा इन्डक्सन चुलोमा सर्दा परिवारको स्वास्थ्य र हिमाल जोगिन्छ।"),
  ("qa_what_trees", "Q: What trees should I plant in Nepal?", "प्रश्न: नेपालमा कुन रूख रोप्ने?",
   "what trees, native species, plant, कुन रूख, स्वदेशी",
   "Choose native species suited to your area, such as sal, utis (alder), oak (kharsu) or rhododendron (lali gurans). They survive better, support local birds and insects, and store carbon. Planting is only half the job; water and protect the sapling until it is well established.",
   "आफ्नो ठाउँ सुहाउने स्वदेशी प्रजाति रोज्नुहोस्, जस्तै साल, उत्तिस, खर्सु वा लालीगुराँस। यी राम्ररी बाँच्छन्, स्थानीय चरा र किरालाई सघाउँछन्, र कार्बन भण्डारण गर्छन्। रोप्नु आधा काम मात्र हो; बिरुवा राम्ररी नहुर्किन्जेल पानी हाल्नुहोस् र जोगाउनुहोस्।"),
  ("qa_best_transport_school", "Q: What is the best way to get to school?", "प्रश्न: स्कुल जाने उत्तम तरिका के हो?",
   "best transport school, walk, cycle, bus, स्कुल जाने, हिँड्ने, बस",
   "Walking or cycling is best for short trips: zero carbon, free and healthy. For longer distances, a public bus or microbus shared with many riders is far cleaner per person than a private motorbike or car. Sharing a ride with classmates is the next best thing.",
   "छोटो यात्राका लागि हिँड्नु वा साइकल चलाउनु उत्तम: शून्य-कार्बन, निःशुल्क र स्वस्थ। लामो दूरीमा धेरै यात्रुसँग साझा गरिएको सार्वजनिक बस वा माइक्रो निजी मोटरसाइकल वा कारभन्दा प्रतिव्यक्ति धेरै सफा हुन्छ। साथीसँग साझा यात्रा अर्को उत्तम विकल्प हो।"),
 ]),
]

def chunks():
    out = []
    for sec_en, sec_ne, items in SECTIONS:
        for cid, t_en, t_ne, tags, x_en, x_ne in items:
            out.append({
                "id": cid, "section": sec_en, "section_ne": sec_ne,
                "tags": [t.strip() for t in tags.split(",")],
                "en": {"title": t_en, "text": x_en},
                "ne": {"title": t_ne, "text": x_ne},
            })
    return out

def build_js(data, path):
    js = "// AUTO-GENERATED by scripts/build_knowledge.py — edit there, then re-run.\n"
    js += "// Bilingual (English + Nepali) RAG knowledge base for Bana.\n"
    js += "export const KB = " + json.dumps(data, ensure_ascii=False, indent=2) + ";\n"
    open(path, "w", encoding="utf-8").write(js)

def find_deva_font(arg=None):
    if arg and os.path.exists(arg):
        return arg
    cands = []
    for d in ["/usr/share/fonts", "/usr/local/share/fonts", os.path.expanduser("~/.fonts"),
              "/Library/Fonts", "/System/Library/Fonts", "C:/Windows/Fonts",
              "/mnt/c/Windows/Fonts"]:
        for pat in ("*NotoSansDevanagari*.ttf", "*NotoSerifDevanagari*.ttf", "*Mangal*.ttf",
                    "*Nirmala*.ttf", "*Kohinoor*.ttf", "*Kalimati*.ttf", "*Preeti*.ttf",
                    "*Lohit*Devanagari*.ttf", "*annapurna*.ttf", "*Annapurna*.ttf"):
            cands += glob.glob(os.path.join(d, "**", pat), recursive=True)
    return cands[0] if cands else None

def build_pdf(data, path, lang, font=None):
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    base = "Helvetica"; baseB = "Helvetica-Bold"
    if lang == "ne":
        if not font:
            print("  ! Nepali PDF skipped — no Devanagari font found. Install one and re-run, e.g.:")
            print("      Debian/Ubuntu: sudo apt install fonts-noto-devanagari")
            print("      or: python scripts/build_knowledge.py --font /path/to/NotoSansDevanagari.ttf")
            return False
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        pdfmetrics.registerFont(TTFont("Deva", font))
        base = baseB = "Deva"
    def sub(t): return t.replace("CO2", "CO<sub>2</sub>")
    ss = getSampleStyleSheet(); green = colors.HexColor("#2d6a4f"); lite = colors.HexColor("#52b788")
    h1 = ParagraphStyle('h1', parent=ss['Title'], fontName=baseB, textColor=green, fontSize=24, spaceAfter=4)
    subt = ParagraphStyle('subt', parent=ss['Normal'], fontName=base, textColor=colors.HexColor("#5a7a66"), fontSize=11, spaceAfter=10)
    sec = ParagraphStyle('sec', parent=ss['Heading1'], fontName=baseB, textColor=green, fontSize=15, spaceBefore=14, spaceAfter=4)
    ttl = ParagraphStyle('ttl', parent=ss['Heading2'], fontName=baseB, textColor=colors.HexColor("#1b4332"), fontSize=12, spaceBefore=8, spaceAfter=2)
    body = ParagraphStyle('body', parent=ss['Normal'], fontName=base, fontSize=10.3, leading=16, spaceAfter=3)
    tag = ParagraphStyle('tag', parent=ss['Normal'], fontName=base, fontSize=7.6, textColor=colors.HexColor("#869e8c"), spaceAfter=8)
    title = "Bana's Green Notebook" if lang == "en" else "बानाको हरित नोटबुक"
    subtitle = ("A student's knowledge base on carbon footprints in Nepal — source for the Bana AI chatbot."
                if lang == "en" else "नेपालमा कार्बन फुटप्रिन्टबारे विद्यार्थी ज्ञानकोष — बाना एआई च्याटबटको स्रोत।")
    kwlabel = "Keywords: " if lang == "en" else "शब्दकुञ्जी: "
    doc = SimpleDocTemplate(path, pagesize=A4, topMargin=18*mm, bottomMargin=16*mm, leftMargin=18*mm, rightMargin=18*mm, title=title)
    story = [Paragraph(sub(title), h1), Paragraph(subtitle, subt), HRFlowable(width="100%", color=lite, thickness=1.4), Spacer(1, 6)]
    cur = None
    for c in data:
        s = c["section"] if lang == "en" else c["section_ne"]
        if s != cur:
            cur = s; story.append(Paragraph(s, sec))
        story.append(Paragraph(sub(c[lang]["title"]), ttl))
        story.append(Paragraph(sub(c[lang]["text"]), body))
        story.append(Paragraph(kwlabel + ", ".join(c["tags"]), tag))
    doc.build(story)
    return True

if __name__ == "__main__":
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    font = None
    if "--font" in sys.argv:
        font = sys.argv[sys.argv.index("--font") + 1]
    data = chunks()
    os.makedirs(os.path.join(here, "knowledge"), exist_ok=True)
    build_js(data, os.path.join(here, "src", "knowledge.js"))
    print(f"OK: src/knowledge.js  ({len(data)} bilingual chunks)")
    build_pdf(data, os.path.join(here, "knowledge", "Bana_Knowledge_Base_EN.pdf"), "en")
    print("OK: knowledge/Bana_Knowledge_Base_EN.pdf")
    deva = find_deva_font(font)
    if build_pdf(data, os.path.join(here, "knowledge", "Bana_Knowledge_Base_NE.pdf"), "ne", deva):
        print("OK: knowledge/Bana_Knowledge_Base_NE.pdf  (font: %s)" % deva)
