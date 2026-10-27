import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { getDashboardData } from "@/lib/sheets/dashboard";

export async function GET() {
  const auth = await requireUser();
  if (!auth.ok) return auth.response;
  const data = await getDashboardData();
  return NextResponse.json(data);
}
