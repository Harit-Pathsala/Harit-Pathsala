import React, { useState } from 'react';
import Icon from './Icons.jsx';
import { useLang } from '../i18n.jsx';

// Nepal's Green School Guidelines — the 8 core pillars, with a practical
// "how to start" for each. Shown to admins and teachers as a reference so they
// can plan tasks and steer their school toward Green-School recognition.
const PILLARS = [
  { icon: 'sprout',
    en: 'One Garden, One School', ne: 'एक बगैंचा, एक विद्यालय',
    descEn: 'Every school sets up and maintains a dedicated garden — local fruit trees and a plot of medicinal herbs.',
    descNe: 'हरेक विद्यालयले आफ्नै बगैंचा बनाउँछ र हेरचाह गर्छ — स्थानीय फलफूल र जडीबुटीको बारी।',
    doEn: 'Start small: one raised bed per class, each class responsible for its own crop.',
    doNe: 'सानोबाट सुरु: हरेक कक्षाको एउटा क्यारी, आ-आफ्नो बालीको जिम्मा।' },
  { icon: 'leaf',
    en: 'Bio-Fencing & Green Infrastructure', ne: 'जैविक बार र हरित संरचना',
    descEn: 'Use natural hedges instead of concrete walls, and climate-smart building tweaks (e.g. insulation that keeps classrooms cool in heat).',
    descNe: 'कंक्रिटको पर्खालको साटो प्राकृतिक झाडी, र जलवायु-मैत्री भवन सुधार (जस्तै गर्मीमा कक्षा सिसिलो राख्ने इन्सुलेसन)।',
    doEn: 'Plant a living hedge along one boundary this season as a pilot.',
    doNe: 'यस सिजनमा एउटा छेउमा जीवित झाडी रोपेर परीक्षण गर्नुहोस्।' },
  { icon: 'recycle',
    en: 'Waste Management & Upcycling', ne: 'फोहोर व्यवस्थापन र पुनः प्रयोग',
    descEn: 'Segregate organic vs inorganic waste, compost canteen/garden scraps to feed the garden, and cut plastic (e.g. ban plastic wrappers on grounds).',
    descNe: 'सड्ने र नसड्ने फोहोर छुट्याउनुहोस्, क्यान्टिन/बगैंचाको फोहोर कम्पोस्ट बनाएर बगैंचामा प्रयोग गर्नुहोस्, र प्लास्टिक घटाउनुहोस्।',
    doEn: 'Place two-bin stations (green/blue) in every corridor and a compost pit near the canteen.',
    doNe: 'हरेक करिडोरमा दुई-बिन (हरियो/नीलो) र क्यान्टिन नजिक कम्पोस्ट खाडल राख्नुहोस्।' },
  { icon: 'book',
    en: 'Biodiversity Kits & Eco-Libraries', ne: 'जैव-विविधता किट र इको-पुस्तकालय',
    descEn: 'Build on-site bio-museums, eco-libraries, pocket aquariums or bee-farms to teach local ecosystems and sustainable micro-enterprise.',
    descNe: 'विद्यालयभित्रै बायो-संग्रहालय, इको-पुस्तकालय, सानो एक्वारियम वा मौरीपालन बनाएर स्थानीय पारिस्थितिकी सिकाउनुहोस्।',
    doEn: 'Begin with an eco-shelf in the library and a labelled leaf/seed collection.',
    doNe: 'पुस्तकालयमा एउटा इको-र्‍याक र नाम लेखिएको पात/बीउ संग्रहबाट सुरु गर्नुहोस्।' },
  { icon: 'droplet',
    en: 'Water & Energy Efficiency', ne: 'पानी र ऊर्जा दक्षता',
    descEn: 'Low-cost green solutions: rainwater harvesting and clean renewable energy such as rooftop solar to reduce grid dependence.',
    descNe: 'कम लागतका समाधान: वर्षाको पानी संकलन र छानामा सौर्य ऊर्जा, ग्रिडमाथिको निर्भरता घटाउन।',
    doEn: 'Add a rooftop-to-tank rainwater line and audit which lights/fans stay on needlessly.',
    doNe: 'छानाबाट ट्यांकीमा वर्षा-पानी लाइन जोड्नुहोस् र बेकार बलिरहेका बत्ती/पंखा जाँच्नुहोस्।' },
  { icon: 'users',
    en: 'Student-Led Eco Clubs', ne: 'विद्यार्थी-नेतृत्वको इको क्लब',
    descEn: 'Active Eco Clubs run the day-to-day work: evacuation drills, community clean-ups, tree plantation on empty land, and the compost/recycling programs.',
    descNe: 'सक्रिय इको क्लबले दैनिक काम चलाउँछ: अभ्यास, सरसफाइ, खाली जग्गामा वृक्षारोपण, र कम्पोस्ट/पुनःचक्रण कार्यक्रम।',
    doEn: 'Form a club with two students per class and a monthly action calendar.',
    doNe: 'हरेक कक्षाबाट दुई विद्यार्थी राखेर क्लब र मासिक कार्य पात्रो बनाउनुहोस्।' },
  { icon: 'shield',
    en: 'School Safety & Climate Resilience', ne: 'विद्यालय सुरक्षा र जलवायु उत्थानशीलता',
    descEn: 'Weave emergency preparedness into the green agenda so children can respond to floods, landslides and climate-induced risks common in Nepal.',
    descNe: 'आपत्‌कालीन तयारीलाई हरित कार्यसूचीसँग जोड्नुहोस्, ताकि बालबालिका बाढी, पहिरो र जलवायुजन्य जोखिमलाई जवाफ दिन सकून्।',
    doEn: 'Run one drill per term and mark safe-assembly points on a school map.',
    doNe: 'हरेक सत्रमा एक अभ्यास गर्नुहोस् र विद्यालय नक्सामा सुरक्षित स्थल चिन्ह लगाउनुहोस्।' },
  { icon: 'school',
    en: 'Whole-Institution & Curriculum Alignment', ne: 'सम्पूर्ण-संस्था र पाठ्यक्रम तालमेल',
    descEn: 'Blend sustainability into the local curriculum across all three tiers of government, using the school\u2019s green steps as live teaching tools for math, biology and geography.',
    descNe: 'तीनै तहको सरकारसँग मिलेर दिगोपनलाई स्थानीय पाठ्यक्रममा मिसाउनुहोस्; विद्यालयका हरित कदमलाई गणित, जीवविज्ञान र भूगोलको जीवन्त शिक्षण साधन बनाउनुहोस्।',
    doEn: 'Pick one subject this term and design two lessons around the garden or waste data.',
    doNe: 'यस सत्र एउटा विषय छानेर बगैंचा वा फोहोर तथ्यांकमा आधारित दुई पाठ बनाउनुहोस्।' },
];

export default function GreenGuidelines({ compact = false }) {
  const { lang } = useLang();
  const tt = (en, ne) => (lang === 'ne' ? ne : en);
  const [open, setOpen] = useState(!compact);

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen((o) => !o)} data-sfx-silent
        style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: 0, textAlign: 'left' }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name="sprout" size={21} /></span>
        <span style={{ flex: 1 }}>
          <b style={{ color: 'var(--ink)', fontSize: '1.02rem' }}>{tt('Green School Guidelines', 'हरित विद्यालय निर्देशिका')}</b>
          <div className="muted" style={{ fontWeight: 700, fontSize: '.8rem' }}>{tt('8 core pillars to plan around', 'योजना बनाउने ८ मुख्य आधार')}</div>
        </span>
        <Icon name="arrowLeft" size={18} style={{ transform: open ? 'rotate(90deg)' : 'rotate(-90deg)', color: 'var(--muted)' }} />
      </button>

      {open && (<>
        <p className="muted" style={{ fontWeight: 600, fontSize: '.88rem', marginTop: 12, lineHeight: 1.5 }}>
          {tt('Introduced by the Ministry of Education, Science and Technology with WWF Nepal and CEHRD, the guidelines turn community schools into hands-on "living laboratories" for environmental stewardship — not just textbook lessons.',
            'शिक्षा, विज्ञान तथा प्रविधि मन्त्रालयले WWF नेपाल र CEHRD सँग मिलेर ल्याएको यो निर्देशिकाले सामुदायिक विद्यालयलाई किताबी पाठमात्र नभई व्यावहारिक "जीवन्त प्रयोगशाला" बनाउँछ।')}
        </p>
        <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
          {PILLARS.map((p, i) => (
            <div key={i} style={{ display: 'flex', gap: 11, padding: '11px 13px', borderRadius: 12, background: 'var(--surface-soft)' }}>
              <span style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', color: 'var(--primary)', display: 'grid', placeItems: 'center', flexShrink: 0, border: '1.5px solid var(--border-soft,#e3ebe0)' }}><Icon name={p.icon} size={18} /></span>
              <div style={{ minWidth: 0 }}>
                <b style={{ color: 'var(--ink)', fontSize: '.94rem' }}>{i + 1}. {tt(p.en, p.ne)}</b>
                <div style={{ color: 'var(--ink)', fontSize: '.85rem', marginTop: 2, lineHeight: 1.45 }}>{tt(p.descEn, p.descNe)}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', marginTop: 5, fontSize: '.82rem', fontWeight: 700, color: 'var(--primary)' }}>
                  <Icon name="check" size={14} style={{ flexShrink: 0, marginTop: 2 }} /><span>{tt('How to start: ', 'कसरी सुरु गर्ने: ')}{tt(p.doEn, p.doNe)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );
}
