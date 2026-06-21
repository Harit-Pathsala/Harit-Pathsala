import { EF, calculateFootprint, getTotalImpactMessage, hexToWorld, hexNeighbors, forestHealthState, completeLevel, ARENA_QUESTIONS, EXPLORER_LEVELS, getTipsForAnswers, cookingCompareDaily } from './logic.js';

let pass=0, fail=0;
const approx=(a,b,t=0.01)=>Math.abs(a-b)<=t;
function check(name, cond, got){ if(cond){pass++; console.log('  ok  '+name);} else {fail++; console.log(' FAIL '+name+'  got='+JSON.stringify(got));} }

// Spec anchor: 20 kWh * 0.12 = 2.4 (Nepal hydro-dominant grid)
check('grid factor 0.12', EF.nepal_grid_kwh===0.12);
check('spec example 20kWh', approx(20*EF.nepal_grid_kwh,2.4));

// A representative "average-ish" student
const a = { transportMode:'public_bus', distanceKm:2, electricityHours:6, hasSolar:false,
  cookingFuel:'lpg', lpgKgMonth:5, foodType:'dal_bhat_local', wasteDisposal:'municipal_bin',
  waterLitresDay:150, schoolElectricity:'moderate', treesCount:0 };
const res = calculateFootprint(a);
console.log('  -> sample net/day =', res.netTotal, 'score=', res.ecoScore, 'breakdown=', res.breakdown);
check('net positive & finite', res.netTotal>0 && isFinite(res.netTotal), res.netTotal);
check('score 0..100', res.ecoScore>=0 && res.ecoScore<=100, res.ecoScore);
check('monthly = net*30', approx(res.monthly, res.netTotal*30, 0.5), res.monthly);

// transport bus: 0.089 * 2 * 2 = 0.356
check('transport bus math', approx(res.breakdown.transport, 0.089*2*2), res.breakdown.transport);
// home elec: 0.3*6*0.12 = 0.216
check('home elec math', approx(res.breakdown.electricity_home, 0.3*6*EF.nepal_grid_kwh), res.breakdown.electricity_home);
// lpg: (5/30/5)*2.983
check('lpg cooking math', approx(res.breakdown.cooking, (5/30/5)*2.983), res.breakdown.cooking);
// food dal bhat: 0.35*2
check('food math', approx(res.breakdown.food, 0.35*2), res.breakdown.food);
// waste municipal: 0.5*0.5
check('waste math', approx(res.breakdown.waste, 0.25), res.breakdown.waste);
// school moderate: 20*0.12/40 = 0.06
check('school elec math', approx(res.breakdown.electricity_school, 20*EF.nepal_grid_kwh/40), res.breakdown.electricity_school);

// High footprint -> low score; trees reduce net
const high = {...a, transportMode:'private_car', distanceKm:10, electricityHours:12, cookingFuel:'firewood', firewoodKgDay:3, foodType:'meat_heavy', wasteDisposal:'open_burning', schoolElectricity:'heavy'};
const hr = calculateFootprint(high);
console.log('  -> high net/day =', hr.netTotal, 'score=', hr.ecoScore);
check('high footprint > sample', hr.netTotal>res.netTotal, hr.netTotal);
check('high score lower', hr.ecoScore<res.ecoScore, hr.ecoScore);
const withTrees = calculateFootprint({...high, treesCount:50});
check('trees reduce net', withTrees.netTotal < hr.netTotal, withTrees.netTotal);

// Impact tone
check('impact high tone', getTotalImpactMessage(7).tone==='high');
check('impact med tone', getTotalImpactMessage(4).tone==='medium');
check('impact low tone', getTotalImpactMessage(2).tone==='low');

// Hex math
check('hexToWorld origin', hexToWorld(0,0).x===0 && hexToWorld(0,0).z===0);
check('hex has 6 neighbors', hexNeighbors(0,0).length===6);
check('health degraded', forestHealthState(1).label.includes('Degraded'));
check('health oldgrowth', forestHealthState(20).label.includes('Old Growth'));

// Explorer
check('8 levels', EXPLORER_LEVELS.length===8, EXPLORER_LEVELS.length);
const decs = EXPLORER_LEVELS[0].events.map(e=>({isCorrect:true, co2Impact:1}));
check('level pass at 100%', completeLevel(decs).passed===true);
check('level fail at 0%', completeLevel(decs.map(d=>({...d,isCorrect:false}))).passed===false);

// Arena
check('30 questions', ARENA_QUESTIONS.length===30, ARENA_QUESTIONS.length);
check('every Q has valid answer idx', ARENA_QUESTIONS.every(q=>q.options[q.answer]!==undefined));

// Tips
check('car tip fires', getTipsForAnswers(high).some(t=>t.category==='transport'));


// Cooking comparison — induction must beat LPG (so LPG is never flagged "best")
check('induction < LPG', cookingCompareDaily('electric') < cookingCompareDaily('lpg'));
check('LPG < firewood', cookingCompareDaily('lpg') < cookingCompareDaily('firewood'));
const cookVals = ['firewood','lpg','electric','mixed'].map(cookingCompareDaily);
check('electric is greenest cooking', Math.min(...cookVals) === cookingCompareDaily('electric'));

// Explorer bilingual + realism
const allEv = EXPLORER_LEVELS.flatMap(l=>l.events);
check('levels have Nepali name/blurb', EXPLORER_LEVELS.every(l=>l.name_ne && l.blurb_ne));
check('all 26 events fully bilingual', allEv.length===26 && allEv.every(e=>e.prompt_ne && e.spot_ne && e.explainRight_ne && e.choices.every(c=>c.label_ne)));
const fert = EXPLORER_LEVELS[1].events[1];
check('Chitwan fertiliser realistic (not kitchen compost)', fert.choices.find(c=>c.correct).label.includes('manure') && !JSON.stringify(fert).includes('Kitchen compost'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
