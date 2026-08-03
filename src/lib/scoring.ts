import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { METHOD2_GROUPS } from "@/lib/data/method2-items";
import type {
  Category,
  CategoryScoreResult,
  Condition,
  Method2Location,
  RatingBand,
  RubricItem,
  ScoreResult,
} from "@/lib/types";

export const CONDITIONS: Condition[] = ["Good", "Ok", "Poor", "Very Poor", "N/A"];

/** Good/Ok/Poor/Very Poor -> 1.0/0.75/0.5/0.25, expressed as 0-100. Referenced everywhere; never inlined. */
export const CONDITION_SCORE: Record<Exclude<Condition, "N/A">, number> = {
  Good: 100,
  Ok: 75,
  Poor: 50,
  "Very Poor": 25,
};

export const CATEGORY_WEIGHT: Record<Category, number> = {
  Functionality: 45,
  Safety: 25,
  Aesthetics: 30,
};

export const CATEGORIES: Category[] = ["Functionality", "Safety", "Aesthetics"];

export function conditionToScore(condition: Condition | undefined): number | undefined {
  if (!condition || condition === "N/A") return undefined;
  return CONDITION_SCORE[condition];
}

/**
 * Renormalizing weighted-average, generic over any numeric value getter:
 * sum(value * weight) / sum(weight) across items where a value exists.
 * Items with no value (N/A / never scored) are excluded from both sides, so
 * the remaining items' weights implicitly fill the gap — matches the live
 * sheet's SUMIF(...) / (SUM(weight) - SUMIF(..., "", weight)) formula exactly.
 */
function weightedAverage<T>(
  items: T[],
  weightOf: (item: T) => number,
  valueOf: (item: T) => number | undefined
): number | null {
  let weightSum = 0;
  let valueSum = 0;
  for (const item of items) {
    const value = valueOf(item);
    if (value === undefined) continue;
    const weight = weightOf(item);
    weightSum += weight;
    valueSum += value * weight;
  }
  return weightSum > 0 ? valueSum / weightSum : null;
}

function scoreItemSet(items: RubricItem[], valueOf: (item: RubricItem) => number | undefined): ScoreResult {
  const categories = {} as Record<Category, CategoryScoreResult>;
  for (const category of CATEGORIES) {
    const categoryItems = items.filter((i) => i.category === category);
    const answeredWeight = categoryItems.reduce((sum, i) => (valueOf(i) === undefined ? sum : sum + i.weight), 0);
    const totalWeight = categoryItems.reduce((sum, i) => sum + i.weight, 0);
    const score = weightedAverage(categoryItems, (i) => i.weight, valueOf);
    categories[category] = { category, score, answeredWeight, totalWeight };
  }

  // Overall uses the identical renormalizing formula across the *full* item
  // set, not a combination of category scores — mathematically equivalent
  // when nothing is N/A, but correct when it is (01-data-and-scoring.md).
  // Each item's effective weight is categoryWeight% * itemWeight-within-category%,
  // since item weights only sum to 100 *within* their own category.
  const overall = weightedAverage(
    items,
    (i) => CATEGORY_WEIGHT[i.category] * i.weight,
    valueOf
  );

  return { overall, categories };
}

export function scoreMethod1(scores: Record<string, Condition>): ScoreResult {
  return scoreItemSet(METHOD1_ITEMS, (item) => conditionToScore(scores[item.name]));
}

/**
 * Combine a Method 2 item group's readings across every location it was
 * scored at into one campus-level numeric score (0-100), or leave it out of
 * the map entirely if it was never scored anywhere (stays N/A / excluded
 * from the weighted formula, same as Method 1).
 *
 * Safety groups: worst observed (minimum) — one real hazard shouldn't be
 * diluted by other rooms being fine. Functionality/Aesthetics groups: average.
 */
export function aggregateMethod2(locations: Method2Location[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const group of METHOD2_GROUPS) {
    const values: number[] = [];
    for (const loc of locations) {
      const v = conditionToScore(loc.scores[group.name]);
      if (v !== undefined) values.push(v);
    }
    if (values.length === 0) continue;
    result[group.name] =
      group.aggregation === "worst" ? Math.min(...values) : values.reduce((a, b) => a + b, 0) / values.length;
  }
  return result;
}

export function scoreMethod2(locations: Method2Location[]): ScoreResult {
  const aggregated = aggregateMethod2(locations);
  return scoreItemSet(METHOD2_GROUPS, (item) => aggregated[item.name]);
}

export function ratingBand(score: number | null): RatingBand | null {
  if (score === null) return null;
  if (score >= 84) return "Excellent";
  if (score >= 67) return "Good";
  if (score >= 50) return "Average";
  return "Poor";
}

export const BAND_COLOR: Record<RatingBand, string> = {
  Excellent: "var(--band-excellent)",
  Good: "var(--band-good)",
  Average: "var(--band-average)",
  Poor: "var(--band-poor)",
};

export function bandColor(score: number | null): string {
  const band = ratingBand(score);
  return band ? BAND_COLOR[band] : "var(--ink-faint)";
}
