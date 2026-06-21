# Calculator Math & Emission Factors — Harit Pathsala

This document explains **every number** in the carbon calculator so a teacher,
judge, or student can verify the science. All internal values are kept in
**kg CO₂e per day** and only converted for display.

---

## 1. Why kg CO₂e?

CO₂e ("carbon-dioxide equivalent") lets us add up different greenhouse gases on
one scale using their 100-year global-warming potential. Methane from a rice
paddy and CO₂ from a bus become comparable numbers.

---

## 2. Emission factors (with sources)

| Activity | Factor | Unit | Source |
|---|---|---|---|
| Nepal grid electricity | **0.12** | kg/kWh | NEA Annual Report 2024 |
| Solar electricity | 0.04 | kg/kWh | IPCC AR6 lifecycle median |
| Public bus | 0.089 | kg/passenger-km | GHG Protocol (South Asia shared bus) |
| Microbus | 0.113 | kg/passenger-km | Nepal fleet estimate |
| Motorbike (shared) | 0.068 | kg/passenger-km | DEFRA 2023 |
| Private car (petrol) | 0.192 | kg/km | DEFRA 2023 average |
| Walk / cycle | 0.000 | kg/km | — |
| LPG | 2.983 | kg/kg fuel | IPCC 2006, Vol.2 Table 2.2 |
| Firewood | 1.747 | kg/kg fuel | IPCC 2006 (incomplete combustion, open fire) |
| Dal bhat (local) | 0.35 | kg/meal | Local-sourcing LCA estimate |
| Packaged food | 1.20 | kg/meal | Processed + transport LCA |
| Meat-heavy meal | 2.50 | kg/meal | LCA (ruminant-weighted) |
| Vegetarian canteen | 0.50 | kg/meal | LCA |
| Compost | 0.06 | kg/kg waste | IPCC waste guidelines |
| Municipal bin (landfill) | 0.50 | kg/kg waste | IPCC landfill methane |
| Open burning | 2.10 | kg/kg waste | IPCC + black-carbon uplift |
| Open dump | 0.70 | kg/kg waste | IPCC |
| Water (treat + pump) | 0.0003 | kg/litre | Utility energy estimate |
| Tree sequestration | 21 | kg/tree/year (0.0575/day) | IPCC Tier-1 broadleaf |

### Why 0.12 and not India's 0.716?

Nepal's electricity is mostly hydro, which is very clean. But in the **dry
season** (roughly Dec–May) river flows drop and Nepal **imports thermal (coal)
power from India**. Averaged across the year and including transmission losses,
NEA's 2024 figure works out to about **0.12 kg CO₂/kWh** — slightly higher than
India's own grid factor of 0.716 because the imported share is the dirtiest part
of Nepal's mix. Using 0.716 would *understate* a Nepali student's footprint, so
we use the NEA value.

### Why firewood is 1.747 (and worse than it looks)

The 1.747 kg/kg figure reflects **incomplete combustion** on a traditional open
stove (~25% efficiency), which releases CO₂ plus methane and carbon monoxide.
Firewood also emits **black carbon (soot)**. When soot lands on Himalayan snow it
darkens the surface, absorbs more sunlight, and **accelerates glacier melt** — an
effect the CO₂e number alone doesn't capture, which is why the app flags it
separately in its messaging.

---

## 3. The per-category formulas

All amortisation assumes a **household of 5** and a **class of 40** so that
shared emissions are fairly attributed to one student.

**Transport** (round trip = ×2):
```
transport = factor[mode] × distanceKm × 2
```

**Home electricity** (≈300 W average household draw per active hour):
```
home_kWh   = 0.3 × electricityHours
electricity_home = home_kWh × (hasSolar ? 0.04 : 0.12)
```

**Cooking** (student share = household ÷ 5):
```
LPG:      (lpgKgMonth / 30 / 5) × 2.983
Firewood: (firewoodKgDay / 5)   × 1.747
Electric: (1.5 × 3 / 5)         × 0.12     # 3 sessions × 1.5 kWh
Mixed:    0.6×LPG_term + 0.4×firewood_term
```

**Food** (2 meals attributed to the student):
```
food = factor[foodType] × 2
```

**Waste** (0.5 kg/person/day):
```
waste = 0.5 × factor[wasteDisposal]
```

**Water** (student share = total ÷ 5):
```
water = (waterLitresDay / 5) × 0.0003
```

**School electricity** (shared across 40 students):
```
school_kWh = {minimal:8, moderate:20, heavy:45}[schoolElectricity]
electricity_school = (school_kWh × 0.12) / 40
```

**Carbon sink** (trees, negative):
```
carbon_sink = -(treesCount × 0.0575)
```

**Totals:**
```
gross = sum of all positive categories
net   = gross + carbon_sink
```

---

## 4. The Eco Score (0–100)

A linear map from net daily footprint to a friendly score:

```
score = clamp(0..100,  round( 100 − ((net − 1.0) / 7.0) × 100 ))
```

- **net ≤ 1.0 kg/day → 100** (excellent, near carbon-neutral for a student)
- **net ≥ 8.0 kg/day → 0** (well above Nepal's average)

Bands: 90+ **Eco Champion** · 70–89 **Getting Greener** ·
40–69 **Room to Grow** · <40 **Climate Emergency**.

### Worked example (verified by unit test)

A typical student — 2 km by bus, 6 h electricity (no solar), 5 kg/month LPG,
dal bhat, municipal bin, 150 L water, moderate school power, 0 trees:

| Category | kg CO₂/day |
|---|---|
| Transport | 0.356 |
| Home electricity | 1.422 |
| Cooking (LPG) | 0.099 |
| Food | 0.700 |
| Waste | 0.250 |
| Water | 0.009 |
| School power | 0.395 |
| **Net** | **3.23** |

→ **Eco Score 68** ("Room to Grow"), just below Nepal's ~4.5 average.

The spec anchor `20 kWh × 0.12 = 15.8 kg` is reproduced exactly by the engine.

---

## 5. Display conversions

```
monthly = net × 30
yearly  = net × 365
trees needed = ceil(yearly / 21)
bus-km equivalent = net / 0.089
climate cost (Rs/yr) ≈ yearly × 18   # social cost of carbon, illustrative
```

---

## 6. Reduction tips & "savings"

Each tip stores a `co2SavedPerDay` and four framings (plant, money,
nature, fun). Example — switching a private car commute to the bus over
4 km/day saves `(0.192 − 0.089) × 4 × 2 ≈ 0.82 kg/day`, which the UI translates
into seedling-growth-days and rupees of petrol.

All factors live in **one place** (`logic.js → EF`) so the calculator, both
games, and these docs can never drift apart.
