import type { RatingBand } from "@/lib/types";

export interface CapturedSchool {
  schoolId: string;
  surveyId: string;
  name: string;
  region: string;
  area: string;
  method: 1 | 2;
  date: string;
  overall: number;
  band: RatingBand;
}

/** Local fallback used only when Sheets credentials aren't configured, so the dashboard is demonstrable end to end. */
export const MOCK_CAPTURED_SCHOOLS: CapturedSchool[] = [
  { schoolId: "29", surveyId: "mock-29", name: "Al-Ameen Campus", region: "South", area: "Landhi", method: 1, date: "2026-06-14", overall: 71, band: "Good" },
  { schoolId: "49", surveyId: "mock-49", name: "Al-Muhaimin Campus-I", region: "South", area: "Landhi", method: 1, date: "2026-06-18", overall: 48, band: "Poor" },
  { schoolId: "122", surveyId: "mock-122", name: "Crescent Steel Campus-VI", region: "South", area: "Landhi", method: 2, date: "2026-06-20", overall: 88, band: "Excellent" },
  { schoolId: "128", surveyId: "mock-128", name: "Dadabhoy Campus", region: "South", area: "Landhi", method: 1, date: "2026-07-02", overall: 63, band: "Average" },
  { schoolId: "590", surveyId: "mock-590", name: "Abdul Aziz Akbar Campus", region: "South West", area: "Baldia Town 2", method: 2, date: "2026-07-05", overall: 76, band: "Good" },
  { schoolId: "748", surveyId: "mock-748", name: "Al-Karam Campus", region: "South", area: "Korangi", method: 1, date: "2026-07-09", overall: 55, band: "Average" },
  { schoolId: "837", surveyId: "mock-837", name: "Alam Foundation Campus-I", region: "North West", area: "Khushab", method: 1, date: "2026-07-11", overall: 91, band: "Excellent" },
  { schoolId: "838", surveyId: "mock-838", name: "Abdul Khaliq Campus", region: "North", area: "Lahore II", method: 2, date: "2026-07-15", overall: 42, band: "Poor" },
];
