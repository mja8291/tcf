export type Category = "Functionality" | "Safety" | "Aesthetics";

export type Condition = "Good" | "Ok" | "Poor" | "Very Poor" | "N/A";

export type PowerSupply =
  | "Grid (Wapda/K.E/LESCO etc.)"
  | "Solar"
  | "Hybrid (Both Grid & Solar)"
  | "No Power"
  | "Other";

export interface RubricItem {
  /** Canonical item name — used as the key in scores/photos/notes maps and as the Sheets column/attachment key. */
  name: string;
  category: Category;
  /** Weight within its category, as a percentage (category's weights sum to 100). */
  weight: number;
  /** Maintained by School Principal/Area Office rather than Engineering/R&M. Display-only marker. */
  principalMaintained?: boolean;
}

export type WorkCategory =
  | "Building Civil Works"
  | "Carpentry Works"
  | "Paint Works"
  | "External Development Works"
  | "Electrical Works"
  | "Plumbing Works";

export interface Method2Group extends RubricItem {
  /** Safety items aggregate by worst-case (minimum); Functionality/Aesthetics aggregate by average. */
  aggregation: "worst" | "average";
  /** Which Work Category card this item is scored under (06-method2-v2-restructure.md). */
  workCategory: WorkCategory;
  /** Which location types this item is scored at. */
  locations: LocationType[];
}

export type LocationType =
  | "Classroom"
  | "Corridor & Stairs"
  | "Toilet"
  | "Exterior Facade"
  | "External Development"
  | "Roof"
  | "Other Room (Staff, Principal, Admin, Store etc.)"
  | "Lab (Wet/Dry/DLP)";

/** Method 2's first pick — which floor the location being scored is on. */
export type FloorLevel = "External" | "Ground" | "First" | "Second" | "Third" | "Fourth" | "Roof";

export interface ItemState {
  scores: Record<string, Condition>;
  photos: Record<string, string>;
  notes: Record<string, string>;
}

export function emptyItemState(): ItemState {
  return { scores: {}, photos: {}, notes: {} };
}

export interface Method2Location {
  id: string;
  floorLevel: FloorLevel;
  type: LocationType;
  name: string;
  /** Only set for Classroom locations — also queryable as their own columns in the response sheet. */
  classroomGrade?: string;
  classroomSection?: string;
  scores: Record<string, Condition>;
  /** Actual File objects, kept client-side until submission uploads them to Drive. */
  photos: Record<string, File>;
  notes: Record<string, string>;
}

export interface School {
  schoolId: string;
  name: string;
  region: string;
  area: string;
}

export interface RespondentDetails {
  asm: string;
  apm: string;
  principal: string;
}

export interface CategoryScoreResult {
  category: Category;
  score: number | null;
  answeredWeight: number;
  totalWeight: number;
}

export interface ScoreResult {
  overall: number | null;
  /** Engineering Department's responsibility -- items without "*" in their name, renormalized to their own 100%. */
  major: number | null;
  /** School staff's own routine-maintenance responsibility -- items with "*" in their name, renormalized to their own 100%. */
  minor: number | null;
  categories: Record<Category, CategoryScoreResult>;
  /** Fixed 7-item watchlist (see scoring.ts CRITICAL_ITEMS), individual/unaggregated. */
  criticalItems: Record<string, number | null>;
}

export type RatingBand = "Poor" | "Average" | "Good" | "Excellent";

export interface SurveySubmission {
  surveyId: string;
  method: 1 | 2;
  school: School;
  asm: string;
  apm: string;
  principal: string;
  powerSupply: PowerSupply;
  complaints: string;
  submittedAt: string;
  overall: number | null;
  functionality: number | null;
  safety: number | null;
  aesthetics: number | null;
  ratingBand: RatingBand | null;
  scores: Record<string, Condition>;
  locations?: Method2Location[];
  attachments: { itemName: string; locationName: string; photoUrl?: string; note?: string }[];
}
