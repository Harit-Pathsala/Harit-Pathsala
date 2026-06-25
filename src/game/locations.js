// Gazetteer for the Nepal entry map. mapX/mapY are in the traced outline's
// 1000 x 580 viewBox (see nepalMapData.js). `kind` decides routing:
//   explorer -> BiomeExplorer at `level`
//   mission  -> the mission component for `missionId` (ready ones are playable)
export const LOCATIONS = [
  // ── Explorer biomes (all five are playable in BiomeExplorer) ──
  { id: 'baglung', kind: 'explorer', level: 1, ready: true, en: 'Baglung', ne: 'बागलुङ', note_en: 'Terraced hill village', note_ne: 'पहाडी गाउँ', mapX: 433.7, mapY: 308.1 },
  { id: 'chitwan', kind: 'explorer', level: 2, ready: true, en: 'Chitwan', ne: 'चितवन', note_en: 'Terai farmland', note_ne: 'तराई खेत', mapX: 536.8, mapY: 412.8 },
  { id: 'kathmandu_x', kind: 'explorer', level: 3, ready: true, en: 'Kathmandu Valley', ne: 'काठमाडौँ उपत्यका', note_en: 'Dense city', note_ne: 'घना सहर', mapX: 646.1, mapY: 388.7 },
  { id: 'kaligandaki', kind: 'explorer', level: 4, ready: true, en: 'Kali Gandaki', ne: 'कालीगण्डकी', note_en: 'River gorge', note_ne: 'नदी घाटी', mapX: 449.6, mapY: 235.9 },
  { id: 'himalaya', kind: 'explorer', level: 5, ready: true, en: 'Himalayan Trail', ne: 'हिमाली यात्रा', note_en: 'Glacial highlands', note_ne: 'हिमाली भू-भाग', mapX: 827.9, mapY: 353.4 },
  { id: 'dhulikhel', kind: 'explorer', level: 6, ready: true, en: 'Dhulikhel', ne: 'धुलिखेल', note_en: 'Hill viewpoint town', note_ne: 'पहाडी सहर', mapX: 674.4, mapY: 400.1 },
  { id: 'janakpur', kind: 'explorer', level: 7, ready: true, en: 'Janakpur', ne: 'जनकपुर', note_en: 'Janaki Mandir · Mithila', note_ne: 'जानकी मन्दिर · मिथिला', mapX: 744.0, mapY: 428.0 },
  { id: 'lumbini', kind: 'explorer', level: 8, ready: true, en: 'Lumbini', ne: 'लुम्बिनी', note_en: 'Birthplace of Buddha', note_ne: 'बुद्ध जन्मस्थल', mapX: 402.0, mapY: 406.0 },

  // ── Missions (Butwal + Tansen playable; rest on the roadmap) ──
  { id: 'butwal', kind: 'mission', missionId: 'm1', ready: true, en: 'Butwal', ne: 'बुटवल', note_en: 'School Commute', note_ne: 'विद्यालय यात्रा', mapX: 416.5, mapY: 388.7 },
  { id: 'tansen', kind: 'mission', missionId: 'm2', ready: true, en: 'Palpa · Tansen', ne: 'पाल्पा · तानसेन', note_en: 'Power Patrol', note_ne: 'ऊर्जा गस्ती', mapX: 428.8, mapY: 364.7 },
  { id: 'gorkha', kind: 'mission', missionId: 'cook', ready: true, en: 'Gorkha', ne: 'गोरखा', note_en: 'Clean Cooking', note_ne: 'सफा खाना पकाउने', mapX: 561.4, mapY: 346.3 },
  { id: 'pokhara', kind: 'mission', missionId: 'm3', ready: true, en: 'Pokhara', ne: 'पोखरा', note_en: 'Phewa Lake Clean-Up', note_ne: 'फेवाताल सफाइ', mapX: 482.8, mapY: 316.6 },
  { id: 'mahendranagar', kind: 'explorer', level: 9, ready: true, en: 'Shuklaphanta', ne: 'शुक्लाफाँटा', note_en: 'Grassland & wildlife', note_ne: 'घाँसे मैदान', mapX: 22.0, mapY: 210.4 },
  { id: 'dadeldhura', kind: 'mission', missionId: 'm_dd', ready: true, en: 'Dadeldhura', ne: 'डडेल्धुरा', note_en: 'Far-west hills', note_ne: 'सुदूर पहाड', mapX: 64.0, mapY: 162.3 },
  { id: 'dhangadhi', kind: 'mission', missionId: 'm6', ready: true, en: 'Dhangadhi', ne: 'धनगढी', note_en: 'Flood Watch', note_ne: 'बाढी सतर्कता', mapX: 65.2, mapY: 248.6 },
  { id: 'apihimal', kind: 'mission', missionId: 'm5', ready: true, en: 'Api Himal Base Camp', ne: 'आपी हिमाल', note_en: 'Base Camp Carry-Out', note_ne: 'आधार शिविर', mapX: 105.8, mapY: 63.2 },
  { id: 'panchkhal', kind: 'mission', missionId: 'm8', ready: true, en: 'Panchkhal', ne: 'पाञ्चखाल', note_en: 'Waste Sort', note_ne: 'फोहोर छुट्याउने', mapX: 683.0, mapY: 394.4 },
  { id: 'bardiya', kind: 'mission', missionId: 'jungle', ready: true, en: 'Bardiya', ne: 'बर्दिया', note_en: 'Sal Forest Patrol', note_ne: 'सालवन गस्ती', mapX: 265.0, mapY: 294.0 },
];
