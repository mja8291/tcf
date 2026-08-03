import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { readRowsByHeader } from "@/lib/sheets/read";
import { buildSingleSurveyWorkbook } from "@/lib/export/single-survey-workbook";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { METHOD2_GROUPS } from "@/lib/data/method2-items";
import { aggregateMethod2 } from "@/lib/scoring";
import type { Condition, Method2Location } from "@/lib/types";

const METHOD1_TAB = process.env.METHOD1_RESPONSE_TAB || "Method 1 Responses";
const METHOD2_TAB = process.env.METHOD2_RESPONSE_TAB || "Method 2 Responses";

export async function GET(_req: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  if (!sheetsConfigured() || !process.env.MQI_SPREADSHEET_ID) {
    return NextResponse.json({ error: "Google Sheets is not configured yet" }, { status: 503 });
  }
  const spreadsheetId = process.env.MQI_SPREADSHEET_ID;

  const m1Rows = await readRowsByHeader(spreadsheetId, METHOD1_TAB).catch(() => []);
  const m1Row = m1Rows.find((r) => r["Survey ID"] === surveyId);

  if (m1Row) {
    const conditions: Record<string, string> = {};
    for (const item of METHOD1_ITEMS) conditions[item.name] = m1Row[item.name] ?? "";
    const wb = buildSingleSurveyWorkbook({
      surveyId,
      campusName: m1Row["Campus Name"] ?? "",
      method: 1,
      submittedAt: m1Row["Timestamp"] ?? "",
      conditions,
      items: METHOD1_ITEMS,
    });
    return xlsxResponse(await wb.xlsx.writeBuffer(), surveyId);
  }

  const m2Rows = await readRowsByHeader(spreadsheetId, METHOD2_TAB).catch(() => []);
  const surveyLocationRows = m2Rows.filter((r) => r["Survey ID"] === surveyId);
  if (surveyLocationRows.length === 0) {
    return NextResponse.json({ error: "Survey not found" }, { status: 404 });
  }

  const locations: Method2Location[] = surveyLocationRows.map((row, i) => {
    const scores: Record<string, Condition> = {};
    for (const group of METHOD2_GROUPS) {
      const value = row[group.name];
      if (value) scores[group.name] = value as Condition;
    }
    return {
      id: String(i),
      type: (row["Location Type"] as Method2Location["type"]) ?? "Classroom",
      name: row["Location Name"] ?? "",
      scores,
      photos: {},
      notes: {},
    };
  });

  const wb = buildSingleSurveyWorkbook({
    surveyId,
    campusName: surveyLocationRows[0]["Campus Name"] ?? "",
    method: 2,
    submittedAt: surveyLocationRows[0]["Timestamp"] ?? "",
    conditions: {},
    aggregatedScores: aggregateMethod2(locations),
    items: METHOD2_GROUPS,
  });
  return xlsxResponse(await wb.xlsx.writeBuffer(), surveyId);
}

function xlsxResponse(
  buffer: Awaited<ReturnType<ReturnType<typeof buildSingleSurveyWorkbook>["xlsx"]["writeBuffer"]>>,
  surveyId: string
) {
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mqi-survey-${surveyId}.xlsx"`,
    },
  });
}
