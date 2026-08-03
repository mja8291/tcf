import type { School } from "@/lib/types";

/**
 * Local fallback used only when GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY
 * aren't configured, so the app is clickable without live Sheets access.
 * Real data comes from Sheets via src/lib/sheets/schools.ts.
 */
export const MOCK_SCHOOLS: School[] = [
  { schoolId: "29", name: "Al-Ameen Campus", region: "South", area: "Landhi" },
  { schoolId: "49", name: "Al-Muhaimin Campus-I", region: "South", area: "Landhi" },
  { schoolId: "122", name: "Crescent Steel Campus-VI", region: "South", area: "Landhi" },
  { schoolId: "128", name: "Dadabhoy Campus", region: "South", area: "Landhi" },
  { schoolId: "831", name: "Feroza Hasham Campus", region: "South", area: "Landhi" },
  { schoolId: "1661", name: "Humaira Hasan Campus", region: "South", area: "Landhi" },
  { schoolId: "444", name: "A. Khaliq Noorani Campus", region: "South", area: "Landhi" },
  { schoolId: "590", name: "Abdul Aziz Akbar Campus", region: "South West", area: "Baldia Town 2" },
  { schoolId: "748", name: "Al-Karam Campus", region: "South", area: "Korangi" },
  { schoolId: "837", name: "Alam Foundation Campus-I", region: "North West", area: "Khushab" },
  { schoolId: "838", name: "Abdul Khaliq Campus", region: "North", area: "Lahore II" },
  { schoolId: "836", name: "Aftab Tapal Campus", region: "Lower Sindh", area: "Hyderabad" },
];
