// One-off: brings "Method 1 Responses" / "Method 2 Responses" column headers
// in line with the rubric sheet re-sync done in Round 3 Task 10.
// Run: node scripts/sync-rubric-headers.mjs        (dry run, prints the plan)
//      node scripts/sync-rubric-headers.mjs --apply (actually writes)
//
// What it does (append-only, never reorders or deletes anything):
//   - Renames "W.Cs/Commodes *" -> "W.Cs/Commodes" in Method 1 Responses
//     (the item lost its principal-maintained asterisk in the rubric sheet;
//     Method 2 Responses already has the un-asterisked name).
//   - Renames "Toilet Flooring condition" -> "Toilet Tile condition" in
//     both response tabs (same item, the rubric sheet just relabeled it —
//     renaming the header in place keeps historical data attached to it,
//     rather than fragmenting the column in two).
//   - Appends a new "Drinking Water Cooler & Filter *" column to both
//     response tabs (a genuinely new rubric item, so this can only be a new
//     column, added at the end).
// Delete this script once it's been run against production.
import fs from "node:fs";
import { google } from "googleapis";

const envPath = new URL("../.env.local", import.meta.url);
const envText = fs.readFileSync(envPath, "utf8");
for (const line of envText.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) {
    let val = m[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    process.env[m[1]] = val;
  }
}

const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_OAUTH_CLIENT_ID, process.env.GOOGLE_OAUTH_CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_OAUTH_REFRESH_TOKEN });
const sheets = google.sheets({ version: "v4", auth: oauth2Client });
const spreadsheetId = process.env.MQI_SPREADSHEET_ID;

const DRY_RUN = process.argv.includes("--apply") ? false : true;
console.log(DRY_RUN ? "DRY RUN (pass --apply to actually write)" : "APPLYING CHANGES");

function colLetter(idx) {
  let s = "";
  idx++;
  while (idx > 0) {
    const rem = (idx - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    idx = Math.floor((idx - 1) / 26);
  }
  return s;
}

async function getSheetMeta(title) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets(properties)" });
  return meta.data.sheets.find((s) => s.properties.title === title).properties;
}

async function renameHeaderCell(tab, oldName, newName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!1:1` });
  const header = res.data.values[0];
  const idx = header.findIndex((h) => h === oldName);
  if (idx === -1) {
    console.log(`  [${tab}] "${oldName}" not found in header — skipping`);
    return;
  }
  const col = colLetter(idx);
  console.log(`  [${tab}] ${col}1: "${oldName}" -> "${newName}"`);
  if (!DRY_RUN) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab}'!${col}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[newName]] },
    });
  }
}

async function appendColumn(tab, newName) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `'${tab}'!1:1` });
  const header = res.data.values[0];
  if (header.includes(newName)) {
    console.log(`  [${tab}] "${newName}" already exists — skipping`);
    return;
  }
  const props = await getSheetMeta(tab);
  const newColIdx = header.length; // 0-indexed position for the new column
  const col = colLetter(newColIdx);
  console.log(`  [${tab}] append ${col}1 = "${newName}" (sheetId=${props.sheetId}, current gridCols=${props.gridProperties.columnCount})`);
  if (!DRY_RUN) {
    if (newColIdx >= props.gridProperties.columnCount) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [
            {
              appendDimension: { sheetId: props.sheetId, dimension: "COLUMNS", length: 1 },
            },
          ],
        },
      });
    }
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `'${tab}'!${col}1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [[newName]] },
    });
  }
}

console.log("\n-- Renames --");
await renameHeaderCell("Method 1 Responses", "W.Cs/Commodes *", "W.Cs/Commodes");
await renameHeaderCell("Method 1 Responses", "Toilet Flooring condition", "Toilet Tile condition");
await renameHeaderCell("Method 2 Responses", "Toilet Flooring condition", "Toilet Tile condition");

console.log("\n-- New columns --");
await appendColumn("Method 1 Responses", "Drinking Water Cooler & Filter *");
await appendColumn("Method 2 Responses", "Drinking Water Cooler & Filter *");

console.log("\nDone.");
