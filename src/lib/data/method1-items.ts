import type { RubricItem } from "@/lib/types";

/**
 * Method 1 — 44 items, flat, one score per campus.
 * 21-item Functionality version (includes "Cabinet *") per 01-data-and-scoring.md —
 * confirmed with TCF: Cabinet was a recent rubric addition; the printed PDF guide
 * and live Google Form still show the older 20-item version and haven't been
 * updated yet. Both illustrative workbooks use this 21-item version.
 * Safety is 14 items (added "Parapet Wall", 2026-08-12 — see rubric audit).
 */
export const METHOD1_ITEMS: RubricItem[] = [
  // Functionality — 45% of overall, 21 items
  { name: "Green board *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Water Storage (Overhead Tank) *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Water Supply line *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Water Taps *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Wash Basin *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Flush Tanks *", category: "Functionality", weight: 5, principalMaintained: true },
  { name: "W.Cs/Commodes *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Sewerage Line functionality *", category: "Functionality", weight: 7, principalMaintained: true },
  { name: "Energy & Power (Distribution Board) *", category: "Functionality", weight: 4, principalMaintained: true },
  { name: "Fans *", category: "Functionality", weight: 5, principalMaintained: true },
  { name: "Light Switch Buttons *", category: "Functionality", weight: 5, principalMaintained: true },
  { name: "Bulbs *", category: "Functionality", weight: 3, principalMaintained: true },
  { name: "Fan Dimmers *", category: "Functionality", weight: 5, principalMaintained: true },
  { name: "Motor (Water pump) *", category: "Functionality", weight: 4, principalMaintained: true },
  { name: "Windows & panes *", category: "Functionality", weight: 3, principalMaintained: true },
  { name: "Cabinet *", category: "Functionality", weight: 3, principalMaintained: true },
  { name: "Soft board *", category: "Functionality", weight: 3, principalMaintained: true },
  { name: "LED/TV *", category: "Functionality", weight: 3, principalMaintained: true },
  { name: "UPS *", category: "Functionality", weight: 3, principalMaintained: true },
  { name: "Solar/UPS Batteries", category: "Functionality", weight: 3 },
  { name: "Solar Panels", category: "Functionality", weight: 2 },

  // Safety — 25% of overall, 14 items (updated 2026-08-12 to match the live
  // "MQI Assessment Rubrics (Method 1)" sheet, which had been rebalanced —
  // adding "Parapet Wall" and reweighting 4 other items — without the app's
  // copy catching up; weights below now match Method 2's Safety set exactly,
  // since the sheet shows both methods sharing one Safety rubric).
  { name: "Boundary wall", category: "Safety", weight: 7 },
  { name: "Grill gate of lab *", category: "Safety", weight: 5, principalMaintained: true },
  { name: "Doors *", category: "Safety", weight: 7, principalMaintained: true },
  { name: "Main Gate", category: "Safety", weight: 7 },
  { name: "Access to roof area /tanks", category: "Safety", weight: 4 },
  { name: "Cracks visibility in roof", category: "Safety", weight: 14 },
  { name: "Cracks visibility in columns", category: "Safety", weight: 7 },
  { name: "Cracks visibility in walls", category: "Safety", weight: 7 },
  { name: "Parapet Wall", category: "Safety", weight: 5 },
  { name: "Internal Flooring condition", category: "Safety", weight: 10 },
  { name: "Roof leakage/seepage", category: "Safety", weight: 7 },
  { name: "Roof Screeding/roof drainage", category: "Safety", weight: 7 },
  { name: "Visibility of dampness", category: "Safety", weight: 7 },
  { name: "Electrical Wiring/Connections", category: "Safety", weight: 6 },

  // Aesthetics — 30% of overall, 9 items
  { name: "Internal Paint", category: "Aesthetics", weight: 15 },
  { name: "External Fascade (Exterior Finish)", category: "Aesthetics", weight: 12 },
  { name: "Toilet Flooring condition", category: "Aesthetics", weight: 12 },
  { name: "Furniture condition *", category: "Aesthetics", weight: 10, principalMaintained: true },
  { name: "Signage *", category: "Aesthetics", weight: 10, principalMaintained: true },
  { name: "Marble Plaque *", category: "Aesthetics", weight: 10, principalMaintained: true },
  { name: "Plaster", category: "Aesthetics", weight: 12 },
  { name: "Masonry", category: "Aesthetics", weight: 12 },
  { name: "CC Jaali", category: "Aesthetics", weight: 7 },
];
