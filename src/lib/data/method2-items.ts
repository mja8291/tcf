import type { LocationType, Method2Group } from "@/lib/types";

/**
 * Method 2 — 23 item groups, scored per location then aggregated to campus level.
 * Safety groups aggregate worst-case (minimum); Functionality/Aesthetics average.
 * See "Aggregating a Method 2 item across multiple locations" in 01-data-and-scoring.md.
 */
export const METHOD2_GROUPS: Method2Group[] = [
  // Safety — 25%, 6 groups, worst-case aggregation
  { name: "Boundary wall", category: "Safety", weight: 15, aggregation: "worst" },
  { name: "Main Gate", category: "Safety", weight: 10, aggregation: "worst" },
  { name: "Roof Access", category: "Safety", weight: 10, aggregation: "worst" },
  { name: "Ceiling Condition i.e. cracks & seepage", category: "Safety", weight: 35, aggregation: "worst" },
  { name: "Wall/Column Condition i.e. cracks", category: "Safety", weight: 15, aggregation: "worst" },
  { name: "Roof Screeding/roof drainage", category: "Safety", weight: 15, aggregation: "worst" },

  // Functionality — 45%, 12 groups, average aggregation
  { name: "Green board/Softboard/Cabinet", category: "Functionality", weight: 6, aggregation: "average" },
  { name: "Water Storage (Overhead Tank)", category: "Functionality", weight: 6, aggregation: "average" },
  { name: "Plumbing Fixtures", category: "Functionality", weight: 20, aggregation: "average" },
  { name: "Electrical Fixtures", category: "Functionality", weight: 15, aggregation: "average" },
  { name: "External Plumbing", category: "Functionality", weight: 10, aggregation: "average" },
  { name: "Door/Windows/Ventilators", category: "Functionality", weight: 10, aggregation: "average" },
  { name: "LED/TV/UPS", category: "Functionality", weight: 3, aggregation: "average" },
  { name: "Solar Panels/Inverter/Batteries", category: "Functionality", weight: 10, aggregation: "average" },
  { name: "Grill gate", category: "Functionality", weight: 3, aggregation: "average" },
  { name: "Flooring Condition", category: "Functionality", weight: 5, aggregation: "average" },
  { name: "Toilet Flooring/tiles", category: "Functionality", weight: 5, aggregation: "average" },
  { name: "Furniture Condition", category: "Functionality", weight: 7, aggregation: "average" },

  // Aesthetics — 30%, 5 groups, average aggregation
  { name: "Paint", category: "Aesthetics", weight: 45, aggregation: "average" },
  { name: "Exterior Finish", category: "Aesthetics", weight: 25, aggregation: "average" },
  { name: "Signage/Plaque", category: "Aesthetics", weight: 15, aggregation: "average" },
  { name: "Plaster/Masonry", category: "Aesthetics", weight: 10, aggregation: "average" },
  { name: "CC Jali", category: "Aesthetics", weight: 5, aggregation: "average" },
];

export const LOCATION_TYPES: LocationType[] = [
  "Classroom",
  "Corridor & Stairs",
  "Toilet",
  "Exterior Facade",
  "External Development",
  "Roof",
  "Other Room (Staff, Principal, Admin, Store etc.)",
  "Lab (Wet/Dry/DLP)",
];

const CLASSROOM_GROUPS = [
  "Green board/Softboard/Cabinet",
  "Electrical Fixtures",
  "Door/Windows/Ventilators",
  "Ceiling Condition i.e. cracks & seepage",
  "Wall/Column Condition i.e. cracks",
  "Flooring Condition",
  "Paint",
  "Furniture Condition",
  "Plaster/Masonry",
];

/** Which Method 2 item groups are scored at each location type. */
export const LOCATION_ITEM_GROUPS: Record<LocationType, string[]> = {
  Classroom: CLASSROOM_GROUPS,
  "Corridor & Stairs": [
    "Electrical Fixtures",
    "Door/Windows/Ventilators",
    "Grill gate",
    "Roof Access",
    "Ceiling Condition i.e. cracks & seepage",
    "Wall/Column Condition i.e. cracks",
    "Flooring Condition",
    "Paint",
    "Plaster/Masonry",
    "CC Jali",
    "Solar Panels/Inverter/Batteries",
  ],
  Toilet: [
    "Toilet Flooring/tiles",
    "Plumbing Fixtures",
    "Electrical Fixtures",
    "Door/Windows/Ventilators",
    "Ceiling Condition i.e. cracks & seepage",
    "Wall/Column Condition i.e. cracks",
    "Paint",
    "Plaster/Masonry",
  ],
  "Exterior Facade": [
    "External Plumbing",
    "Door/Windows/Ventilators",
    "Grill gate",
    "Wall/Column Condition i.e. cracks",
    "Roof Screeding/roof drainage",
    "Exterior Finish",
    "Signage/Plaque",
    "Plaster/Masonry",
    "CC Jali",
  ],
  "External Development": ["Boundary wall", "Main Gate", "External Plumbing", "Plaster/Masonry"],
  Roof: [
    "Roof Screeding/roof drainage",
    "Water Storage (Overhead Tank)",
    "External Plumbing",
    "Roof Access",
    "Wall/Column Condition i.e. cracks",
    "Plaster/Masonry",
    "Solar Panels/Inverter/Batteries",
  ],
  "Other Room (Staff, Principal, Admin, Store etc.)": CLASSROOM_GROUPS,
  "Lab (Wet/Dry/DLP)": [
    "Green board/Softboard/Cabinet",
    "Plumbing Fixtures",
    "Electrical Fixtures",
    "Door/Windows/Ventilators",
    "LED/TV/UPS",
    "Grill gate",
    "Ceiling Condition i.e. cracks & seepage",
    "Wall/Column Condition i.e. cracks",
    "Flooring Condition",
    "Paint",
    "Furniture Condition",
    "Plaster/Masonry",
  ],
};

export function method2GroupsForLocation(type: LocationType): Method2Group[] {
  const names = new Set(LOCATION_ITEM_GROUPS[type]);
  return METHOD2_GROUPS.filter((g) => names.has(g.name));
}

/**
 * Location types that only ever have one instance on a campus, so naming
 * that instance is pointless friction — skip the naming step and go
 * straight to scoring, with the location's name set to the type itself.
 */
export const UNNAMED_LOCATION_TYPES: LocationType[] = [
  "Corridor & Stairs",
  "Exterior Facade",
  "External Development",
  "Roof",
];

/**
 * Location types with a fixed set of real-world instances — presented as a
 * select instead of a free-text name field. Types not listed here
 * (Classroom) keep the free-text field.
 */
export const LOCATION_NAME_OPTIONS: Partial<Record<LocationType, string[]>> = {
  Toilet: ["Girls Toilet", "Boys Toilet", "Female Staff Toilet", "Male Staff Toilet"],
  "Lab (Wet/Dry/DLP)": ["Wet Lab", "Dry Lab", "DLP", "Bio/Chemistry Lab", "Physics lab"],
  "Other Room (Staff, Principal, Admin, Store etc.)": [
    "Staff room",
    "Principal Room",
    "Admin Room",
    "Store",
    "Janitor Room",
    "Chemistry lab store",
    "Physics lab store",
    "Pantry",
  ],
};
