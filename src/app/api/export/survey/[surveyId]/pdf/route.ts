import { NextResponse } from "next/server";
import { sheetsConfigured } from "@/lib/sheets/client";
import { buildSingleSurveyPdf } from "@/lib/export/single-survey-pdf";
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

  const itemValues: Record<string, string> =
    found.method === 1
      ? found.conditions
      : Object.fromEntries(
          Object.entries(found.aggregatedScores ?? {}).map(([name, score]) => [
            name,
            `Aggregated (${Math.round(score)}%)`,
          ])
        );

  const bytes = await buildSingleSurveyPdf({
    surveyId,
    campusName: found.campusName,
    region: found.region,
    area: found.area,
    method: found.method,
    submittedAt: found.submittedAt,
    apm: found.apm,
    asm: found.asm,
    principal: found.principal,
    powerSupply: found.powerSupply,
    complaints: found.complaints,
    overall: found.overall,
    functionality: found.functionality,
    safety: found.safety,
    aesthetics: found.aesthetics,
    ratingBand: found.ratingBandLabel,
    itemValues,
    items: found.items,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="mqi-survey-${surveyId}.pdf"`,
    },
  });
}
