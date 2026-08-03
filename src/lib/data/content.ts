import type { Category, PowerSupply } from "@/lib/types";

export const OATH_TEXT =
  "I undertake to affirm that I am the Administration & Support Manager of the above mentioned school and that the responses provided in the assessment form are in accordance with the provided instructions and guidance. The provided ratings are, to the best of my knowledge, a true and actual representation of the school condition.";

export const POWER_SUPPLY_OPTIONS: PowerSupply[] = [
  "Grid (Wapda/K.E/LESCO etc.)",
  "Solar",
  "Hybrid (Both Grid & Solar)",
  "No Power",
  "Other",
];

interface RatingDefinition {
  en: string;
  ur: string;
}

/** Bilingual condition definitions, verbatim from TCF's existing production copy — reuse, don't retranslate. */
export const RATING_DEFINITIONS: Record<Category, Record<"Good" | "Ok" | "Poor" | "Very Poor", RatingDefinition>> = {
  Functionality: {
    Good: {
      en: "The item works perfectly and serves its purpose effectively.",
      ur: "چیز بہترین طریقے سے کام کر رہی ہے۔",
    },
    Ok: {
      en: "The item works adequately, but there might be occasional minor issues.",
      ur: "چیز معمولی طریقے سے کام کرتی ہے۔",
    },
    Poor: {
      en: "The item works with limitations and might hinder its intended purpose.",
      ur: "چیز محدود طریقے سے کام کرتی ہے اور کچھ مشکلات پیدا کرتی ہے۔",
    },
    "Very Poor": {
      en: "The item is non-functional or severely limits its intended purpose.",
      ur: "چیز کام نہیں کرتی ہے یا کام کرنے میں رکاوٹ پیدا کرتی ہے۔",
    },
  },
  Safety: {
    Good: {
      en: "The item poses no safety concerns and meets all relevant standards.",
      ur: "چیز کو کوئی خطرہ نہیں ہے۔",
    },
    Ok: {
      en: "The item generally meets safety standards but might have minor concerns.",
      ur: "چیز معمولی حفاظتی معیارات پر پوری اترتی ہے۔",
    },
    Poor: {
      en: "The item has safety concerns that need attention.",
      ur: "چیز معمولی حفاظتی خطرات پیدا کرتی ہے۔",
    },
    "Very Poor": {
      en: "The item poses serious safety risks and requires immediate action.",
      ur: "چیز سنگین حفاظتی خطرات پیدا کرتی ہے اور فوری مرمت کی ضرورت ہوتی ہے۔",
    },
  },
  Aesthetics: {
    Good: {
      en: "The item is well-maintained with no visible damage or signs of wear.",
      ur: "چیز میں کوئی نقصان نہیں ہے۔",
    },
    Ok: {
      en: "The item shows minor cosmetic imperfections with acceptable appearance.",
      ur: "چیز میں تھوڑا نقصان ہے۔",
    },
    Poor: {
      en: "The item displays noticeable damage or wear that affects its appearance.",
      ur: "چیز میں نقصان ہے جو دیکھنے میں آتا ہے۔",
    },
    "Very Poor": {
      en: "The item is extensively damaged, with an unpleasant appearance.",
      ur: "چیز بہت زیادہ نقصان میں ہے۔",
    },
  },
};

/** "Thumb rule" guidance for items with multiple physical instances — judgment guidance for the surveyor, not something the app computes. */
export const THUMB_RULE: { rating: string; guidance: string }[] = [
  { rating: "Good", guidance: "At least 80% of the instances are Good and/or OK" },
  { rating: "OK", guidance: "60-79% of the instances are Good and/or OK" },
  {
    rating: "Poor",
    guidance: "Very Poor instances are 30% or less, and Poor + Very Poor together are under 70%",
  },
  {
    rating: "Very Poor",
    guidance: "Very Poor instances exceed 30%, or Poor + Very Poor together exceed 70%",
  },
];
