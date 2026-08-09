import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { buildSingleSurveyWorkbook } from "@/lib/export/single-survey-workbook";
import { findSurvey } from "@/lib/export/find-survey";

export async function GET(_req: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  if (!sheetsConfigured() || !process.env.MQI_SPREADSHEET_ID) {
    return NextResponse.json({ error: "Google Sheets is not configured yet" }, { status: 503 });
  }
  const found = await findSurvey(process.env.MQI_SPREADSHEET_ID, surveyId);
  if (!found) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const wb = buildSingleSurveyWorkbook({
    surveyId,
    campusName: found.campusName,
    method: found.method,
    submittedAt: found.submittedAt,
    conditions: found.conditions,
    aggregatedScores: found.aggregatedScores,
    items: found.items,
  });
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mqi-survey-${surveyId}.xlsx"`,
    },
  });
}
