# Carbon Calculator — Emission Factors & Formulas

**All emission factors are taken from the organizer's `Emission_factors.xlsx`.**
Values that the sheet does not provide (rooftop-solar lifecycle, tree sequestration,
school-canteen firewood) are clearly marked "not in sheet" and used only by the
optional whole-school tool, never in a student's footprint.

Source of truth: `src/logic.js` (`EF`, `calculateFootprint`, `calculateSchoolFootprint`).

## Emission factors used (from the xlsx)

| Activity | Factor | Unit | Sheet row |
|---|---|---|---|
| Grid electricity | **0.23** | kg CO₂ / kWh | "Grid electricity used" (Nepal avg) |
| LPG | **1.51** | kg CO₂ / kg LPG | "LPG use" |
| LPG (per cylinder) | **21.442** | kg CO₂ / cylinder | 14.2 kg × 1.51 (Nepal cylinder = 14.2 kg) |
| Motorbike | **0.066** | kg CO₂ / km | "Motorbike commute" (35 km/l) |
| Car | **0.19** | kg CO₂ / km | "Car commute" (12 km/l) |
| Bus | **0.016** | kg CO₂ / km | "Bus commute" (4 km/l, 40 passengers) |
| General waste (landfill) | **0.827** | kg CO₂e / kg | "Solid waste" sheet |
| Stationery / supplies | **0.0017285** | kg CO₂e / NPR | "Stationary supplies" (1.7285 / 1000 NPR) |
| Diesel | **2.65** | kg CO₂ / L | "Diesel…" (school tool) |
| Petrol | **2.31** | kg CO₂ / L | "Petrol…" (school tool) |

Walking and cycling are 0.

## Student footprint — questions and formulas

The student answers 5 simple, practical questions. Everything is computed in
**kg CO₂ per day**. No "best option" is shown while answering — the Eco Score and
full breakdown appear only at the end so students answer honestly.

1. **Transport (to school)** — mode + one-way distance
   `transport = factor[mode] × distanceKm × 2`  (×2 = round trip)
2. **Home electricity** — monthly units (kWh) from the NEA bill + solar toggle
   `electricity = (units ÷ 30) × (hasSolar ? 0.04 : 0.23)`
3. **Cooking (LPG)** — cylinders per month (1 cylinder = 14.2 kg)
   `cooking = (cylinders × 21.442) ÷ 30`
4. **Waste** — how much thrown per day (little 0.3 / medium 0.6 / a lot 1.2 kg)
   `waste = wasteKgDay × 0.827`
5. **Stationery** — monthly spend (NPR)
   `stationery = (npr ÷ 30) × 0.0017285`

`daily = sum of the five`, `monthly = daily × 30`, `yearly = daily × 365`.

### Eco Score (0–100)
`score = clamp(0, 100, 100 − ((daily − 0.5) / 2.5) × 100)`
→ 100 at ≤ 0.5 kg/day, 0 at ≥ 3.0 kg/day.

Worked example (bus 2 km, 90 units, 1 cylinder, medium waste, Rs 200):
transport 0.064 + electricity 0.690 + cooking 0.715 + waste 0.496 + stationery 0.012
= **1.98 kg/day** → eco score **41**, ≈ 721 kg/yr.

## What changed from the old calculator
- Electricity now uses **monthly units (kWh) × 0.23**, not the broken "300 kW/hour".
- Cooking now asks **LPG cylinders/month** (1 = 14.2 kg), not kg of cylinder/wood.
- **Removed**: water question, school-electricity question, food question.
- **Added**: stationery question (SVG icons only, no emoji).
- All transport/cooking/electricity/waste factors replaced with the xlsx values.

## Final result
After calculating, the student sees their Eco Score, daily/monthly/yearly totals,
a breakdown donut, tailored tips, and a **comparison against their school average**
(computed live from every student's latest result via `db.getSchoolAverage()`).

## Whole-school tool (admin/teacher only)
`calculateSchoolFootprint` estimates a school's annual emissions (commute, electricity,
canteen cooking, waste, minus tree offsets) using the same xlsx factors:
commute uses bus 0.016 and a motorbike+car average; electricity 0.23; cooking LPG 1.51;
waste 0.827. Firewood (1.747, *not in the sheet*) remains available only for canteens
that still burn wood, and is labelled as such.
