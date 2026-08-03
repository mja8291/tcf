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

export interface Method2Group extends RubricItem {
  /** Safety groups aggregate by worst-case (minimum); Functionality/Aesthetics aggregate by average. */
  aggregation: "worst" | "average";
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
  type: LocationType;
  name: string;
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
  categories: Record<Category, CategoryScoreResult>;
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
