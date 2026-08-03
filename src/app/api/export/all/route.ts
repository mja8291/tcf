import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { readRowsByHeader } from "@/lib/sheets/read";
import { buildAllResponsesWorkbook } from "@/lib/export/all-responses-workbook";

const METHOD1_TAB = process.env.METHOD1_RESPONSE_TAB || "Method 1 Responses";
const METHOD2_TAB = process.env.METHOD2_RESPONSE_TAB || "Method 2 Responses";

export async function GET() {
  if (!sheetsConfigured() || !process.env.MQI_SPREADSHEET_ID) {
    return NextResponse.json({ error: "Google Sheets is not configured yet" }, { status: 503 });
  }
  const spreadsheetId = process.env.MQI_SPREADSHEET_ID;
  const [m1Rows, m2Rows] = await Promise.all([
    readRowsByHeader(spreadsheetId, METHOD1_TAB).catch(() => []),
    readRowsByHeader(spreadsheetId, METHOD2_TAB).catch(() => []),
  ]);

  const wb = buildAllResponsesWorkbook(m1Rows, m2Rows);
  const buffer = await wb.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="mqi-all-responses.xlsx"`,
    },
  });
}
