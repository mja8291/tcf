import type { Category, Condition, FloorLevel, LocationType, Method2Group } from "@/lib/types";
import { OK_UNSAFE, ROOF_ACCESS } from "./condition-overrides";

/**
 * Method 2 — 31 item groups (Safety 8 / Functionality 16 / Aesthetics 7),
 * re-synced 2026-10-28 against the "MQI Assessment Rubrics (Method B)" tab of
 * the revised rubric workbook (first synced 2026-10-27 with 30 groups, frozen
 * in method2-v20261027-items.ts; since then Internal Flooring was added and
 * Wash Basin 7->6, Flush Tanks 8->7, Sewerage System 8->7, Electrical
 * Fixtures 8->6, Switch/Dimmer Sheet 7->6, Door/Windows/Ventilators 8->7). Names, order, "Category Weightage" and the
 * per-group Location column are read directly from it; each division's
 * weights sum to 100. This replaces the previous 45-item / 6-work-category
 * version (frozen in method2-legacy-items.ts): Method B scores whole item
 * *groups* per location, and has no Work Category column, so a location's
 * groups are sectioned by division (Safety / Functionality / Aesthetics)
 * instead.
 *
 * Decisions made on top of the sheet, confirmed with the rubric owner
 * 2026-10-27:
 *   - Sewerage System is scored at Toilet / External Development / Lab (the
 *     sheet lists it under Exterior Facade only, which was taken to be a
 *     typo and left as it was in the previous version).
 *   - The two-button "OK / Unsafe" pickers score OK = 100%, Unsafe = 25%, and
 *     Roof Access moves onto the same scale — see condition-overrides.ts.
 * Not in the sheet, derived here:
 *   - principalMaintained (drives the Minor score) is true when every item
 *     the sheet's own Method A "Item Group" column files under the group is
 *     one of its "*" (school-maintained) items. Distribution Board is mixed
 *     (Energy & Power * + Electrical Wiring) and stays with Engineering.
 *   - Safety groups aggregate across locations by worst case, the others by
 *     average — unchanged from the previous version.
 * Items the old list had that Method B has no group for (Grill gate,
 * Drinking Water Cooler & Filter) are no longer scored in Method 2.
 */
function worst(item: Omit<Method2Group, "aggregation" | "category"> & { category: "Safety" }): Method2Group {
  return { ...item, aggregation: "worst" };
}
function average(
  item: Omit<Method2Group, "aggregation" | "category"> & { category: "Functionality" | "Aesthetics" }
): Method2Group {
  return { ...item, aggregation: "average" };
}

const CLASSROOM: LocationType = "Classroom";
const CORRIDOR: LocationType = "Corridor & Stairs";
const TOILET: LocationType = "Toilet";
const FACADE: LocationType = "Exterior Facade";
const EXT_DEV: LocationType = "External Development";
const ROOF: LocationType = "Roof";
const OTHER_ROOM: LocationType = "Other Room (Staff, Principal, Admin, Store etc.)";
const LAB: LocationType = "Lab (Wet/Dry/DLP)";

export const METHOD2_GROUPS: Method2Group[] = [
  // Safety — 25% of overall, 8 groups
  worst({ name: "Boundary wall", category: "Safety", weight: 10, locations: [EXT_DEV] }),
  worst({ name: "Main Gate", category: "Safety", weight: 7, locations: [EXT_DEV] }),
  worst({
    name: "Roof Access",
    category: "Safety",
    weight: 10,
    locations: [ROOF],
    conditionOverride: ROOF_ACCESS,
    hideNA: true,
  }),
  worst({
    name: "Concrete/Plaster Soundness",
    category: "Safety",
    weight: 15,
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
    conditionOverride: OK_UNSAFE,
  }),
  worst({
    name: "Ceiling Condition i.e. cracks & seepage",
    category: "Safety",
    weight: 25,
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
    conditionOverride: OK_UNSAFE,
  }),
  worst({
    name: "Wall/Column Condition i.e. cracks",
    category: "Safety",
    weight: 10,
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
    conditionOverride: OK_UNSAFE,
  }),
  worst({
    name: "Roof Screeding/roof drainage",
    category: "Safety",
    weight: 15,
    locations: [ROOF],
    conditionOverride: OK_UNSAFE,
  }),
  worst({ name: "Distribution Board", category: "Safety", weight: 8, locations: [CORRIDOR] }),

  // Functionality — 45% of overall, 15 groups
  average({
    name: "Green board/Softboard/Cabinet",
    category: "Functionality",
    weight: 10,
    principalMaintained: true,
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),
  average({
    name: "Water Storage (Overhead Tank)",
    category: "Functionality",
    weight: 6,
    principalMaintained: true,
    locations: [ROOF],
  }),
  average({
    name: "External Plumbing",
    category: "Functionality",
    weight: 6,
    principalMaintained: true,
    locations: [EXT_DEV],
  }),
  average({ name: "Taps", category: "Functionality", weight: 7, principalMaintained: true, locations: [TOILET, LAB] }),
  average({
    name: "Wash Basin",
    category: "Functionality",
    weight: 6,
    principalMaintained: true,
    locations: [TOILET, LAB],
  }),
  average({
    name: "Flush Tanks",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    locations: [TOILET],
  }),
  average({ name: "W.Cs/Commodes", category: "Functionality", weight: 5, locations: [TOILET, LAB] }),
  average({
    name: "Sewerage System",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    locations: [TOILET, EXT_DEV, LAB],
  }),
  average({
    name: "Electrical Fixtures",
    category: "Functionality",
    weight: 6,
    principalMaintained: true,
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM],
  }),
  average({
    name: "Switch/Dimmer Sheet",
    category: "Functionality",
    weight: 6,
    principalMaintained: true,
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM],
  }),
  average({
    name: "Motor (Water pump)",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    locations: [EXT_DEV],
  }),
  // The sheet's Location column for this group is blank (as of 2026-10-28);
  // a group with no location would never be asked, so it uses the locations
  // the Method A tab gives its "Internal Flooring condition" item. Toilet
  // is left out — it has its own "Toilet Flooring/tiles" group.
  average({
    name: "Internal Flooring",
    category: "Functionality",
    weight: 7,
    locations: [CLASSROOM, CORRIDOR, OTHER_ROOM, LAB],
  }),
  average({
    name: "Furniture Condition",
    category: "Functionality",
    weight: 5,
    principalMaintained: true,
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),
  average({
    name: "Door/Windows/Ventilators",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    locations: [CLASSROOM, TOILET, CORRIDOR, FACADE, OTHER_ROOM, LAB],
  }),
  average({
    name: "LED/TV/UPS",
    category: "Functionality",
    weight: 5,
    principalMaintained: true,
    locations: [LAB],
  }),
  average({
    name: "Solar Panels/Inverter/Batteries",
    category: "Functionality",
    weight: 7,
    locations: [CORRIDOR, ROOF, OTHER_ROOM],
  }),

  // Aesthetics — 30% of overall, 7 groups
  average({
    name: "Paint",
    category: "Aesthetics",
    weight: 35,
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),
  average({ name: "Exterior Finish", category: "Aesthetics", weight: 25, locations: [FACADE] }),
  average({ name: "Toilet Flooring/tiles", category: "Aesthetics", weight: 5, locations: [TOILET] }),
  average({ name: "Signage", category: "Aesthetics", weight: 15, principalMaintained: true, locations: [FACADE] }),
  average({ name: "Plaque", category: "Aesthetics", weight: 5, principalMaintained: true, locations: [CORRIDOR] }),
  average({
    name: "Plaster/Masonry",
    category: "Aesthetics",
    weight: 10,
    locations: [CLASSROOM, TOILET, CORRIDOR, FACADE, ROOF, OTHER_ROOM, LAB],
  }),
  average({ name: "CC Jali", category: "Aesthetics", weight: 5, locations: [CORRIDOR, FACADE] }),
];

/** Display order of a location's scoring sections. */
export const METHOD2_SECTIONS: Category[] = ["Safety", "Functionality", "Aesthetics"];

export const LOCATION_TYPES: LocationType[] = [
  CLASSROOM,
  CORRIDOR,
  TOILET,
  FACADE,
  EXT_DEV,
  ROOF,
  OTHER_ROOM,
  LAB,
];

export const FLOOR_LEVELS: FloorLevel[] = ["External", "Ground", "First", "Second", "Third", "Fourth", "Roof"];

// Roof is deliberately excluded here (2026-09-19, per the rubric sheet's
// "Level Option Page" — Roof's own row has no location-type options at
// all): it's already its own floor level with its own auto-created
// location (see chooseFloor's Roof special-case in m2/page.tsx), so
// offering it again as a type card *within* Ground/First/etc. was a
// redundant, confusing duplicate route to the exact same location shape.
const GROUND_LIKE_TYPES: LocationType[] = [CLASSROOM, CORRIDOR, TOILET, OTHER_ROOM, LAB];

/** Which location types are offered on a given floor. Empty = skip the Location page (Roof floor only). */
export const FLOOR_LOCATION_TYPES: Record<FloorLevel, LocationType[]> = {
  External: [FACADE, EXT_DEV],
  Ground: GROUND_LIKE_TYPES,
  First: GROUND_LIKE_TYPES,
  Second: GROUND_LIKE_TYPES,
  Third: GROUND_LIKE_TYPES,
  Fourth: GROUND_LIKE_TYPES,
  Roof: [],
};

/**
 * Location types that only ever have one instance per visit, so naming it is
 * pointless friction — auto-name instead (e.g. "Roof 1", incrementing).
 */
export const UNNAMED_LOCATION_TYPES: LocationType[] = [CORRIDOR, FACADE, EXT_DEV, ROOF];

/** Fixed-choice dependent dropdown for location types that aren't free-text or auto-named. Classroom is handled separately (grade + section). */
export const LOCATION_NAME_OPTIONS: Partial<Record<LocationType, string[]>> = {
  Toilet: ["Girls Toilet", "Boys Toilet", "Female Staff Toilet", "Male Staff Toilet"],
  "Lab (Wet/Dry/DLP)": ["Wet Lab", "Dry Lab", "DLP", "Bio/Chemistry Lab", "Physics Lab"],
  "Other Room (Staff, Principal, Admin, Store etc.)": [
    "Staff room",
    "Principal Room",
    "Admin Room",
    "Store",
    "Chemistry/Wet Lab Store",
    "Physics/Dry Lab Store",
    "Pantry",
    "Others",
  ],
};

// Round 3 Task 12: Classroom naming isn't free text or a flat "Classroom 1,
// Classroom 2..." list — it's this Grade x Section combinator (see
// M2_SET_CLASSROOM in survey-context.tsx, name = `${grade} ${section}`).
// Nursery slots in as an additional grade, pairing with a section like
// every other grade, rather than as a one-off special case.
/**
 * Library/Art Room/Art Room-Library (2026-09-19) aren't actual grades, but
 * they're picked from this same list rather than getting their own page —
 * same precedent as Nursery above. Unlike every real grade, a campus
 * normally has just one of each, so a Section pick would be forced busywork
 * for the common case — see CLASSROOM_GRADES_WITH_OPTIONAL_SECTION, which
 * is what actually excuses Continue from requiring one for these three.
 */
export const CLASSROOM_GRADES = [
  "Nursery",
  "KG",
  ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`),
  "Library",
  "Art Room/Library",
  "Art Room",
];
/** Grades that don't need a Section to disambiguate — a campus has one of each of these, not several. */
export const CLASSROOM_GRADES_WITH_OPTIONAL_SECTION = ["Library", "Art Room/Library", "Art Room"];
/** Campuses use either lettered or coloured sections — offer both, ASM picks whichever applies. */
export const CLASSROOM_SECTIONS = ["A", "B", "C", "D", "E", "Red", "Yellow", "Green", "Blue"];

export function method2GroupsForLocation(type: LocationType): Method2Group[] {
  return METHOD2_GROUPS.filter((g) => g.locations.includes(type));
}

/** True once every item group applicable to this location has a score — the same completeness rule the scoring page enforces, applied to a whole recorded location at once. */
export function isMethod2LocationComplete(location: { type: LocationType; scores: Record<string, Condition> }): boolean {
  return method2GroupsForLocation(location.type).every((g) => Boolean(location.scores[g.name]));
}

export function method2GroupsForLocationAndSection(type: LocationType, section: Category): Method2Group[] {
  return method2GroupsForLocation(type).filter((g) => g.category === section);
}

/** Group counts per section for a specific location type — drives the scoring page's section counts (location-specific, not global). */
export function sectionCountsForLocation(type: LocationType): Record<Category, number> {
  const counts: Record<Category, number> = { Safety: 0, Functionality: 0, Aesthetics: 0 };
  for (const group of method2GroupsForLocation(type)) counts[group.category]++;
  return counts;
}
