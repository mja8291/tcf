/**
 * Stamped onto every submission and written to the response tabs' "Rubric
 * Version" column. A row without one was scored against the pre-2026-10-27
 * item lists (see method1-legacy-items.ts / method2-legacy-items.ts) — that
 * is how an export knows which weights to recalculate with. Bump this (and
 * freeze a new legacy snapshot) the next time item names or weights change.
 */
export const RUBRIC_VERSION = "2026-10-27";
