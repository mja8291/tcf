import type { FloorLevel, LocationType, Method2Group, WorkCategory } from "@/lib/types";

/**
 * Method 2 v2 — 44 items across 6 work categories, per
 * 06-method2-v2-restructure.md (supersedes the old 23-item-group version).
 * Weights are each item's share of its scoring category (Functionality 45%
 * / Safety 25% / Aesthetics 30%) — the same weighting mechanics as Method 1,
 * just regrouped into work categories for entry and reweighted. Safety here
 * has 14 items (not Method 1's 13 — adds "Parapet Wall") with different
 * weights on shared items (e.g. Doors 7% here vs 12% in Method 1); verified
 * independently that Functionality/Safety/Aesthetics each still sum to 100%.
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
  // Plumbing Works — 8 items, all Functionality
  average({
    name: "Water Storage (Overhead Tank) *",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [ROOF],
  }),
  average({
    name: "Water Supply line *",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [TOILET, EXT_DEV, ROOF, LAB],
  }),
  average({
    name: "Water Taps *",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [TOILET, LAB],
  }),
  average({
    name: "Wash Basin *",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [TOILET, LAB],
  }),
  average({
    name: "Flush Tanks *",
    category: "Functionality",
    weight: 5,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [TOILET],
  }),
  average({
    name: "W.Cs/Commodes",
    category: "Functionality",
    weight: 7,
    workCategory: "Plumbing Works",
    locations: [TOILET],
  }),
  average({
    name: "Sewerage Line functionality *",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [TOILET, EXT_DEV, LAB],
  }),
  average({
    name: "Motor (Water pump) *",
    category: "Functionality",
    weight: 4,
    principalMaintained: true,
    workCategory: "Plumbing Works",
    locations: [EXT_DEV, OTHER_ROOM],
  }),

  // Electrical Works — 10 items, Functionality except Electrical Wiring/Connections (Safety)
  average({
    name: "Energy & Power (Distribution Board) *",
    category: "Functionality",
    weight: 4,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [CORRIDOR, LAB],
  }),
  average({
    name: "Fans *",
    category: "Functionality",
    weight: 5,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),
  average({
    name: "Light Switch Buttons *",
    category: "Functionality",
    weight: 5,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, LAB],
  }),
  average({
    name: "Bulbs *",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, LAB],
  }),
  average({
    name: "Fan Dimmers *",
    category: "Functionality",
    weight: 5,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),
  average({
    name: "LED/TV *",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [LAB],
  }),
  average({
    name: "UPS *",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    workCategory: "Electrical Works",
    locations: [LAB],
  }),
  average({
    name: "Solar/UPS Batteries",
    category: "Functionality",
    weight: 3,
    workCategory: "Electrical Works",
    locations: [CORRIDOR],
  }),
  average({
    name: "Solar Panels",
    category: "Functionality",
    weight: 2,
    workCategory: "Electrical Works",
    locations: [ROOF],
  }),
  worst({
    name: "Electrical Wiring/Connections",
    category: "Safety",
    weight: 6,
    workCategory: "Electrical Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),

  // Carpentry Works — 5 items
  average({
    name: "Windows/Ventilator & panes *",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    workCategory: "Carpentry Works",
    locations: [CLASSROOM, TOILET, OTHER_ROOM, LAB],
  }),
  average({
    name: "Cabinet *",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    workCategory: "Carpentry Works",
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),
  average({
    name: "Soft board *",
    category: "Functionality",
    weight: 3,
    principalMaintained: true,
    workCategory: "Carpentry Works",
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),
  worst({
    name: "Doors *",
    category: "Safety",
    weight: 7,
    principalMaintained: true,
    workCategory: "Carpentry Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),
  average({
    name: "Furniture condition *",
    category: "Aesthetics",
    weight: 10,
    principalMaintained: true,
    workCategory: "Carpentry Works",
    locations: [CLASSROOM, OTHER_ROOM, LAB],
  }),

  // Paint Works — 3 items
  average({
    name: "Green board *",
    category: "Functionality",
    weight: 7,
    principalMaintained: true,
    workCategory: "Paint Works",
    locations: [CLASSROOM, LAB],
  }),
  average({
    name: "Internal Paint",
    category: "Aesthetics",
    weight: 15,
    workCategory: "Paint Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),
  average({
    name: "External Fascade (Exterior Finish)",
    category: "Aesthetics",
    weight: 12,
    workCategory: "Paint Works",
    locations: [FACADE],
  }),

  // External Development Works — 2 items
  worst({
    name: "Boundary wall",
    category: "Safety",
    weight: 7,
    workCategory: "External Development Works",
    locations: [EXT_DEV],
  }),
  worst({
    name: "Main Gate",
    category: "Safety",
    weight: 7,
    workCategory: "External Development Works",
    locations: [EXT_DEV],
  }),

  // Internal Civil Works — 16 items
  worst({
    name: "Grill gate *",
    category: "Safety",
    weight: 5,
    principalMaintained: true,
    workCategory: "Internal Civil Works",
    locations: [CORRIDOR, LAB, ROOF],
  }),
  worst({
    name: "Access to roof area /tanks",
    category: "Safety",
    weight: 4,
    workCategory: "Internal Civil Works",
    locations: [ROOF],
  }),
  worst({
    name: "Cracks visibility in roof",
    category: "Safety",
    weight: 14,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),
  worst({
    name: "Cracks visibility in columns",
    category: "Safety",
    weight: 7,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, FACADE, ROOF, OTHER_ROOM, LAB],
  }),
  worst({
    name: "Cracks visibility in walls",
    category: "Safety",
    weight: 7,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, FACADE, OTHER_ROOM, LAB],
  }),
  worst({
    name: "Parapet Wall",
    category: "Safety",
    weight: 5,
    workCategory: "Internal Civil Works",
    locations: [ROOF],
  }),
  worst({
    name: "Internal Flooring condition",
    category: "Safety",
    weight: 10,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, CORRIDOR, OTHER_ROOM, LAB],
  }),
  worst({
    name: "Roof leakage/seepage",
    category: "Safety",
    weight: 7,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),
  worst({
    name: "Roof Screeding/roof drainage",
    category: "Safety",
    weight: 7,
    workCategory: "Internal Civil Works",
    locations: [ROOF],
  }),
  worst({
    name: "Visibility of dampness",
    category: "Safety",
    weight: 7,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, OTHER_ROOM, LAB],
  }),
  average({
    name: "Toilet Flooring condition",
    category: "Aesthetics",
    weight: 12,
    workCategory: "Internal Civil Works",
    locations: [TOILET],
  }),
  average({
    name: "Signage *",
    category: "Aesthetics",
    weight: 10,
    principalMaintained: true,
    workCategory: "Internal Civil Works",
    locations: [FACADE],
  }),
  average({
    name: "Marble Plaque *",
    category: "Aesthetics",
    weight: 10,
    principalMaintained: true,
    workCategory: "Internal Civil Works",
    locations: [CORRIDOR],
  }),
  average({
    name: "Plaster",
    category: "Aesthetics",
    weight: 12,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, FACADE, OTHER_ROOM, LAB],
  }),
  average({
    name: "Masonry",
    category: "Aesthetics",
    weight: 12,
    workCategory: "Internal Civil Works",
    locations: [CLASSROOM, TOILET, CORRIDOR, FACADE, OTHER_ROOM, LAB],
  }),
  average({
    name: "CC Jaali",
    category: "Aesthetics",
    weight: 7,
    workCategory: "Internal Civil Works",
    locations: [TOILET, CORRIDOR, FACADE, OTHER_ROOM],
  }),
];

/** Display order for the Work Category page's 6 cards. */
export const WORK_CATEGORIES: WorkCategory[] = [
  "Internal Civil Works",
  "Carpentry Works",
  "Paint Works",
  "External Development Works",
  "Electrical Works",
  "Plumbing Works",
];

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

const GROUND_LIKE_TYPES: LocationType[] = [CLASSROOM, CORRIDOR, TOILET, ROOF, OTHER_ROOM, LAB];

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

export const CLASSROOM_GRADES = ["KG", ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
/** Campuses use either lettered or coloured sections — offer both, ASM picks whichever applies. */
export const CLASSROOM_SECTIONS = ["A", "B", "C", "D", "E", "Red", "Yellow", "Green", "Blue"];

export function method2GroupsForLocation(type: LocationType): Method2Group[] {
  return METHOD2_GROUPS.filter((g) => g.locations.includes(type));
}

export function method2GroupsForLocationAndCategory(type: LocationType, workCategory: WorkCategory): Method2Group[] {
  return method2GroupsForLocation(type).filter((g) => g.workCategory === workCategory);
}

/** Item counts per work category for a specific location type — drives the Work Category page's card counts (location-specific, not global). */
export function workCategoryCountsForLocation(type: LocationType): Record<WorkCategory, number> {
  const counts = Object.fromEntries(WORK_CATEGORIES.map((c) => [c, 0])) as Record<WorkCategory, number>;
  for (const item of method2GroupsForLocation(type)) counts[item.workCategory]++;
  return counts;
}
