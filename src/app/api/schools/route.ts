import { NextResponse } from "next/server";
import { getSchools } from "@/lib/sheets/schools";

export async function GET() {
  const schools = await getSchools();
  return NextResponse.json({ schools });
}
