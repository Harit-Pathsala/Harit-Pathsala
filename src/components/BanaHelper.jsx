import React, { useEffect, useRef, useState } from 'react';
import { BanaFace } from './Bana.jsx';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

// Instant, per-level "how to finish" steps. No AI here (Ask Bana handles open chat) — this is fast & personalised.
const HELP = {
  default: { title: { en: 'How to explore', ne: 'कसरी घुम्ने' }, steps: [
    { en: 'Move with the arrows / WASD / d-pad and walk around the place.', ne: 'arrows / WASD / d-pad ले हिँड्नुहोस् र ठाउँ घुम्नुहोस्।' },
    { en: 'Go to each glowing spot and read what Bana asks.', ne: 'हरेक चम्किलो स्थानमा जानुहोस् र बानाले सोधेको पढ्नुहोस्।' },
    { en: 'Pick the greener, lower-carbon choice each time.', ne: 'हरेक पटक हरित, कम-कार्बन विकल्प छान्नुहोस्।' },
    { en: 'Finish all the stops to complete the level.', ne: 'लेभल सक्न सबै स्थान पूरा गर्नुहोस्।' } ] },
  'mission:jungle': { title: { en: 'Bardiya forest patrol', ne: 'बर्दिया वन गस्ती' }, steps: [
    { en: 'Follow the yellow arrow to each task.', ne: 'हरेक काममा पहेँलो तीर पछ्याउनुहोस्।' },
    { en: 'Check the wildlife and put out the fire.', ne: 'वन्यजन्तु हेर्नुहोस् र आगो निभाउनुहोस्।' },
    { en: 'Plant the sal saplings where marked.', ne: 'चिन्ह लगाएको ठाउँमा साल बिरुवा रोप्नुहोस्।' },
    { en: 'Reach the ranger post to finish.', ne: 'सक्न रेन्जर पोस्टमा पुग्नुहोस्।' } ] },
  'mission:m5': { title: { en: 'Api Himal clean-up', ne: 'आपी हिमाल सफाइ' }, steps: [
    { en: 'Walk over the litter to pick it up (pack holds 7).', ne: 'फोहोरमाथि हिँडेर उठाउनुहोस् (झोलामा ७ अट्छ)।' },
    { en: 'When the pack is full, go to the green recycle station.', ne: 'झोला भरिएपछि हरियो पुनःचक्रण स्टेसनमा जानुहोस्।' },
    { en: 'Empty it there, then go back for more.', ne: 'त्यहाँ खाली गर्नुहोस्, अनि फेरि जानुहोस्।' },
    { en: 'Carry out all 14 pieces before time runs out.', ne: 'समय सकिनुअघि सबै १४ टुक्रा बोक्नुहोस्।' } ] },
  'mission:m1': { title: { en: 'Butwal school run', ne: 'बुटवल विद्यालय यात्रा' }, steps: [
    { en: 'Look at each way to get to school.', ne: 'विद्यालय पुग्ने हरेक तरिका हेर्नुहोस्।' },
    { en: 'The bus and bicycle make far less carbon than a car.', ne: 'बस र साइकलले कारभन्दा धेरै कम कार्बन बनाउँछ।' },
    { en: 'Choose the low-carbon ride to win.', ne: 'जित्न कम-कार्बन सवारी छान्नुहोस्।' } ] },
  'mission:m_dd': { title: { en: 'Dadeldhura trip', ne: 'डडेलधुरा यात्रा' }, steps: [
    { en: 'Compare the travel choices.', ne: 'यात्रा विकल्पहरू तुलना गर्नुहोस्।' },
    { en: 'Sharing a ride or taking the bus cuts carbon per person.', ne: 'सवारी साझा वा बस लिँदा प्रतिव्यक्ति कार्बन घट्छ।' },
    { en: 'Pick the greenest option.', ne: 'सबैभन्दा हरित विकल्प छान्नुहोस्।' } ] },
  'mission:m2': { title: { en: 'Power patrol', ne: 'ऊर्जा गस्ती' }, steps: [
    { en: 'Tap the lights and devices that are left on.', ne: 'बलिरहेका बत्ती र उपकरण थिच्नुहोस्।' },
    { en: 'Switching them off cuts wasted electricity.', ne: 'बन्द गर्दा खेर जाने बिजुली घट्छ।' },
    { en: 'Turn off enough before the timer ends.', ne: 'समय सकिनुअघि पर्याप्त बन्द गर्नुहोस्।' } ] },
  'mission:cook': { title: { en: 'Clean cooking', ne: 'सफा खाना पकाउने' }, steps: [
    { en: 'Cook each dish with the cleanest fuel.', ne: 'हरेक परिकार सफा इन्धनमा पकाउनुहोस्।' },
    { en: 'LPG and electric make much less smoke than firewood.', ne: 'एलपीजी र बिजुलीले दाउराभन्दा कम धुवाँ बनाउँछ।' },
    { en: 'Avoid smoke and finish the meals.', ne: 'धुवाँ नबनाई खाना सक्नुहोस्।' } ] },
  'mission:m3': { title: { en: 'Lake clean-up', ne: 'ताल सफाइ' }, steps: [
    { en: 'Scoop the floating trash out of the lake.', ne: 'तालमा पौडिएको फोहोर निकाल्नुहोस्।' },
    { en: 'Try not to miss too many pieces.', ne: 'धेरै टुक्रा नछुटाउनुहोस्।' },
    { en: 'Clear enough to make the water clean again.', ne: 'पानी सफा बनाउन पर्याप्त निकाल्नुहोस्।' } ] },
  'mission:m6': { title: { en: 'Dhangadhi flood watch', ne: 'धनगढी बाढी सतर्कता' }, steps: [
    { en: 'Tap a drain to clear the rubbish blocking it.', ne: 'नाली थिचेर छेकेको फोहोर हटाउनुहोस्।' },
    { en: 'Blocked drains make the water rise fast.', ne: 'छेकिएका नालीले पानी छिटो बढाउँछ।' },
    { en: 'Keep the water below the red line until the storm passes.', ne: 'आँधी नटरेसम्म पानी रातो रेखामुनि राख्नुहोस्।' } ] },
  'mission:m8': { title: { en: 'Waste sorting', ne: 'फोहोर छुट्याउने' }, steps: [
    { en: 'Drag each item into the right bin.', ne: 'हरेक वस्तु सही बिनमा तान्नुहोस्।' },
    { en: 'Compost food, recycle plastic, landfill the rest.', ne: 'खाना कम्पोस्ट, प्लास्टिक पुनःचक्रण, बाँकी ल्यान्डफिल।' },
    { en: 'Sort enough correctly to win.', ne: 'जित्न पर्याप्त सही छुट्याउनुहोस्।' } ] },
};

export default function BanaHelper({ levelKey }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const help = HELP[levelKey] || HELP.default;
  const [open, setOpen] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [seen, setSeen] = useState(false);

  // gentle recurring "Can I help?" nudge until opened once
  useEffect(() => {
    if (open || seen) { setNudge(false); return; }
    let hide;
    const show = setTimeout(() => { setNudge(true); hide = setTimeout(() => setNudge(false), 6500); }, 8000);
    const again = setInterval(() => { setNudge(true); setTimeout(() => setNudge(false), 6500); }, 30000);
    return () => { clearTimeout(show); clearTimeout(hide); clearInterval(again); };
  }, [open, seen, levelKey]);

  const openHelp = () => { setOpen(true); setSeen(true); setNudge(false); };

  return (
    <>
      {!open && (
        <div style={{ position: 'fixed', right: 16, bottom: 18, zIndex: 60, display: 'flex', alignItems: 'flex-end', gap: 8, flexDirection: 'column' }}>
          {nudge && (
            <button onClick={openHelp} style={{ alignSelf: 'flex-end', border: 'none', cursor: 'pointer', background: '#fff', color: '#1c3326', fontWeight: 800, borderRadius: 14, padding: '8px 12px', boxShadow: '0 6px 18px rgba(0,0,0,.25)', maxWidth: 210, fontSize: '.86rem' }}>
              {tt('Can I help? 🐾', 'मद्दत गरूँ? 🐾')}
            </button>
          )}
          <button onClick={openHelp} title={tt('How to finish', 'कसरी सक्ने')} style={{ border: 'none', cursor: 'pointer', background: '#fff', borderRadius: '50%', padding: 5, boxShadow: '0 6px 18px rgba(0,0,0,.3)', lineHeight: 0, position: 'relative' }}>
            <BanaFace size={48} />
            <span style={{ position: 'absolute', top: 2, right: 2, width: 12, height: 12, borderRadius: '50%', background: '#2f9e44', border: '2px solid #fff' }} />
          </button>
        </div>
      )}

      {open && (
        <div style={{ position: 'fixed', right: 14, bottom: 14, zIndex: 60, width: 'min(340px, 92vw)', background: '#fff', borderRadius: 16, boxShadow: '0 14px 40px rgba(0,0,0,.35)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', background: '#eaf6ea', borderBottom: '1px solid #d4e6d4' }}>
            <div style={{ background: '#fff', borderRadius: '50%', padding: 2, lineHeight: 0 }}><BanaFace size={30} /></div>
            <strong style={{ flex: 1, color: '#1c3326', fontSize: '.95rem' }}>{tt(help.title.en, help.title.ne)}</strong>
            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#1c3326', fontWeight: 800, fontSize: '1.2rem', lineHeight: 1 }}>×</button>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: '.86rem', color: '#52684f', fontWeight: 700, marginBottom: 10 }}>{tt('Here\u2019s how to finish this:', 'यसरी सक्नुहोस्:')}</div>
            <ol style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 9 }}>
              {help.steps.map((st, i) => (
                <li key={i} style={{ fontSize: '.92rem', lineHeight: 1.4, color: '#23351f', fontWeight: 500 }}>{tt(st.en, st.ne)}</li>
              ))}
            </ol>
            <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #eef3ee', fontSize: '.8rem', color: '#7a8a7a', display: 'flex', gap: 6, alignItems: 'center' }}>
              <Icon name="chat" size={14} /> {tt('Want to ask something? Use Ask Bana in the menu.', 'केही सोध्न चाहनुहुन्छ? मेनुमा बानालाई सोध्नुहोस् प्रयोग गर्नुहोस्।')}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
