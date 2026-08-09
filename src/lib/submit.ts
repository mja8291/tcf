import type { Condition, FloorLevel, LocationType, PowerSupply, School } from "@/lib/types";
import type { ScoreResult } from "@/lib/types";

interface SubmitLocation {
  id: string;
  floorLevel: FloorLevel;
  type: LocationType;
  name: string;
  classroomGrade?: string;
  classroomSection?: string;
  scores: Record<string, Condition>;
  photos: Record<string, File>;
  notes: Record<string, string>;
}

interface SubmitState {
  school: School;
  method: 1 | 2;
  asm: string;
  apm: string;
  principal: string;
  powerSupply: PowerSupply;
  complaints: string;
  m1: { scores: Record<string, Condition>; photos: Record<string, File>; notes: Record<string, string> };
  m2: { locations: SubmitLocation[] };
}

export interface SubmitPayload {
  surveyId: string;
  method: 1 | 2;
  school: School;
  asm: string;
  apm: string;
  principal: string;
  powerSupply: PowerSupply;
  complaints: string;
  overall: number | null;
  functionality: number | null;
  safety: number | null;
  aesthetics: number | null;
  scores: Record<string, Condition>;
  locations?: {
    id: string;
    floorLevel: FloorLevel;
    type: LocationType;
    name: string;
    classroomGrade?: string;
    classroomSection?: string;
    scores: Record<string, Condition>;
    notes: Record<string, string>;
  }[];
  /** attachmentKey -> note text, for items/locations that have a note but maybe no photo. */
  notes: { attachmentKey: string; itemName: string; locationName: string; note: string }[];
  /** attachmentKey -> {itemName, locationName}, used to match uploaded file fields back to items server-side. */
  photoKeys: { attachmentKey: string; itemName: string; locationName: string }[];
}

export interface SubmitFile {
  attachmentKey: string;
  file: File;
}

export interface Submission {
  payload: SubmitPayload;
  files: SubmitFile[];
}

/**
 * Builds the plain-data submission (JSON-serializable payload + the raw File
 * objects for any photos) without touching FormData, so the same result can
 * either be sent immediately or queued in IndexedDB and sent later when back
 * online — see src/lib/offline/sync.ts.
 */
export function buildSubmission(state: SubmitState, result: ScoreResult): Submission {
  const surveyId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${state.school.schoolId}-${Date.now()}`;

  const files: SubmitFile[] = [];
  const photoKeys: SubmitPayload["photoKeys"] = [];
  const notes: SubmitPayload["notes"] = [];

  if (state.method === 1) {
    for (const [itemName, file] of Object.entries(state.m1.photos)) {
      const key = itemName;
      photoKeys.push({ attachmentKey: key, itemName, locationName: "" });
      files.push({ attachmentKey: key, file });
    }
    for (const [itemName, note] of Object.entries(state.m1.notes)) {
      if (note?.trim()) notes.push({ attachmentKey: itemName, itemName, locationName: "", note });
    }
  } else {
    for (const loc of state.m2.locations) {
      for (const [itemName, file] of Object.entries(loc.photos)) {
        const key = `${loc.id}::${itemName}`;
        photoKeys.push({ attachmentKey: key, itemName, locationName: loc.name });
        files.push({ attachmentKey: key, file });
      }
      for (const [itemName, note] of Object.entries(loc.notes)) {
        if (note?.trim()) notes.push({ attachmentKey: `${loc.id}::${itemName}`, itemName, locationName: loc.name, note });
      }
    }
  }

  const payload: SubmitPayload = {
    surveyId,
    method: state.method,
    school: state.school,
    asm: state.asm,
    apm: state.apm,
    principal: state.principal,
    powerSupply: state.powerSupply,
    complaints: state.complaints,
    overall: result.overall,
    functionality: result.categories.Functionality.score,
    safety: result.categories.Safety.score,
    aesthetics: result.categories.Aesthetics.score,
    scores: state.method === 1 ? state.m1.scores : {},
    locations:
      state.method === 2
        ? state.m2.locations.map((l) => ({
            id: l.id,
            floorLevel: l.floorLevel,
            type: l.type,
            name: l.name,
            classroomGrade: l.classroomGrade,
            classroomSection: l.classroomSection,
            scores: l.scores,
            notes: l.notes,
          }))
        : undefined,
    notes,
    photoKeys,
  };

  return { payload, files };
}

/** Rebuilds the multipart form the /api/submit route expects from a plain Submission. */
export function formDataFromSubmission({ payload, files }: Submission): FormData {
  const formData = new FormData();
  for (const { attachmentKey, file } of files) {
    formData.append(`photo:${attachmentKey}`, file, file.name);
  }
  formData.append("payload", JSON.stringify(payload));
  return formData;
}
