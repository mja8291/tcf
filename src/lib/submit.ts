import type {
  BuildingStructure,
  Condition,
  FloorLevel,
  LocationType,
  PhotoAsset,
  PowerSupply,
  School,
  StructuralConcern,
} from "@/lib/types";
import type { ScoreResult } from "@/lib/types";

interface SubmitLocation {
  id: string;
  floorLevel: FloorLevel;
  type: LocationType;
  name: string;
  classroomGrade?: string;
  classroomSection?: string;
  scores: Record<string, Condition>;
  photos: Record<string, PhotoAsset[]>;
  notes: Record<string, string>;
}

interface SubmitState {
  school: School;
  method: 1 | 2;
  asm: string;
  apm: string;
  principal: string;
  powerSupply: PowerSupply;
  structuralConcern: StructuralConcern;
  buildingStructure: BuildingStructure;
  complaints: string;
  m1: { scores: Record<string, Condition>; photos: Record<string, PhotoAsset[]>; notes: Record<string, string> };
  m2: { locations: SubmitLocation[] };
  /** Minted once at SET_METHOD and carried through every photo upload for this attempt — see survey-context.tsx. Required by the time Review can call buildSubmission (method must be set to get there); the crypto fallback below only guards a state shape that shouldn't occur. */
  surveyId: string | null;
  /** ISO timestamp set when the method was chosen — see survey-context.tsx SET_METHOD. */
  startTime: string | null;
  /** See survey-context.tsx PAUSE_TIMER/RESUME_TIMER. pausedAt is the still-open pause span (if any) at submit time; pausedSeconds is everything already accrued from earlier completed pauses. */
  pausedAt: string | null;
  pausedSeconds: number;
}

export interface SubmitPayload {
  surveyId: string;
  method: 1 | 2;
  school: School;
  asm: string;
  apm: string;
  principal: string;
  powerSupply: PowerSupply;
  /** Optional in the type only because a submission queued by an older app version (still sitting in IndexedDB) predates these two — the server treats a missing value as blank. */
  structuralConcern?: StructuralConcern;
  buildingStructure?: BuildingStructure;
  complaints: string;
  overall: number | null;
  functionality: number | null;
  safety: number | null;
  aesthetics: number | null;
  /** Engineering Department's responsibility (non-"*" items), renormalized to its own 100%. */
  major: number | null;
  /** School staff's own routine maintenance ("*" items), renormalized to its own 100%. */
  minor: number | null;
  /** Fixed 7-item watchlist (scoring.ts CRITICAL_ITEMS), individual/unaggregated. */
  criticalItems: Record<string, number | null>;
  /** ISO timestamps + elapsed seconds between method selection and submission. startTime is null if the method was somehow never recorded (shouldn't happen, but don't crash the submit over it). timeTakenSeconds excludes any paused time — see pausedSeconds. */
  startTime: string | null;
  endTime: string;
  timeTakenSeconds: number | null;
  /** Total seconds the assessment was paused for, including any pause still open at submit time. */
  pausedSeconds: number;
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
  /** Every successfully-uploaded photo (see Round 3 Task 8 — uploaded individually on attach, well before this payload is built) with the Drive url already resolved. No raw photo bytes ever travel through this payload. */
  photoKeys: { attachmentKey: string; itemName: string; locationName: string; url: string }[];
}

/**
 * A photo that hadn't successfully uploaded to Drive by submit time — most
 * often because it was attached with no connectivity at all, not just a
 * one-off blip (see photo-upload.ts / use-photo-upload-handlers.ts, which
 * upload each photo immediately on attach and have no automatic retry of
 * their own). Carrying the raw File here — safe in IndexedDB, unlike a
 * network payload, since structured clone handles File natively (same as
 * SurveyDraft already relies on) — is what lets a fully-offline assessment
 * still queue for later instead of Submit being blocked until every photo
 * resolves. See offline/sync.ts, which retries these independently of the
 * JSON payload every time it flushes the queue.
 */
export interface PendingPhotoUpload {
  attachmentKey: string;
  itemName: string;
  locationName: string;
  location?: { floorLevel: string; type: string; name: string };
  file: File;
}

export interface Submission {
  payload: SubmitPayload;
  pendingPhotos: PendingPhotoUpload[];
}

/**
 * Builds the plain-data, JSON-serializable submission payload — no File
 * objects and no upload work happens here (every photo already uploaded to
 * Drive individually on attach; see src/lib/photo-upload.ts). That's what
 * keeps this payload small enough to queue in IndexedDB and retry offline
 * — see src/lib/offline/sync.ts — without ever risking Vercel's 4.5MB
 * request-body limit the way the old all-in-one submit did.
 *
 * Photos still "uploading" are skipped here — the Review page blocks
 * Submit while any are genuinely in flight, to avoid racing that upload's
 * own state update, so this should never see one in practice. Photos in
 * "error" status (most often: attached with no connectivity) are *not*
 * skipped — they're collected into `pendingPhotos` instead of `photoKeys`,
 * so the assessment can still be submitted (to the offline queue if
 * necessary) instead of being stuck forever behind a photo that can't
 * upload yet. See PendingPhotoUpload's doc comment.
 */
export function buildSubmission(state: SubmitState, result: ScoreResult): Submission {
  const surveyId = state.surveyId ?? `${state.school.schoolId}-${Date.now()}`;

  const photoKeys: SubmitPayload["photoKeys"] = [];
  const pendingPhotos: PendingPhotoUpload[] = [];
  const notes: SubmitPayload["notes"] = [];

  const endTime = new Date().toISOString();
  const endMs = new Date(endTime).getTime();
  // Any pause still open at submit time counts too — a user can in principle
  // reach Review while paused (nothing forces a resume), so don't undercount it.
  const openPauseSeconds = state.pausedAt ? Math.max(0, (endMs - new Date(state.pausedAt).getTime()) / 1000) : 0;
  const pausedSeconds = Math.round(state.pausedSeconds + openPauseSeconds);
  const timeTakenSeconds = state.startTime
    ? Math.max(0, Math.round((endMs - new Date(state.startTime).getTime()) / 1000) - pausedSeconds)
    : null;

  if (state.method === 1) {
    for (const [itemName, itemPhotos] of Object.entries(state.m1.photos)) {
      itemPhotos.forEach((photo, i) => {
        const attachmentKey = `${itemName}::${i}`;
        if (photo.status === "uploaded" && photo.url) {
          photoKeys.push({ attachmentKey, itemName, locationName: "", url: photo.url });
        } else if (photo.status === "error") {
          pendingPhotos.push({ attachmentKey, itemName, locationName: "", file: photo.file });
        }
      });
    }
    for (const [itemName, note] of Object.entries(state.m1.notes)) {
      if (note?.trim()) notes.push({ attachmentKey: itemName, itemName, locationName: "", note });
    }
  } else {
    for (const loc of state.m2.locations) {
      for (const [itemName, itemPhotos] of Object.entries(loc.photos)) {
        itemPhotos.forEach((photo, i) => {
          const attachmentKey = `${loc.id}::${itemName}::${i}`;
          if (photo.status === "uploaded" && photo.url) {
            photoKeys.push({ attachmentKey, itemName, locationName: loc.name, url: photo.url });
          } else if (photo.status === "error") {
            pendingPhotos.push({
              attachmentKey,
              itemName,
              locationName: loc.name,
              location: { floorLevel: loc.floorLevel, type: loc.type, name: loc.name },
              file: photo.file,
            });
          }
        });
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
    structuralConcern: state.structuralConcern,
    buildingStructure: state.buildingStructure,
    complaints: state.complaints,
    overall: result.overall,
    functionality: result.categories.Functionality.score,
    safety: result.categories.Safety.score,
    aesthetics: result.categories.Aesthetics.score,
    major: result.major,
    minor: result.minor,
    criticalItems: result.criticalItems,
    startTime: state.startTime,
    endTime,
    timeTakenSeconds,
    pausedSeconds,
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

  return { payload, pendingPhotos };
}

/**
 * Counts photos still mid-upload or that failed to upload, across every
 * item/location's photo map — the Review page uses this to block Submit
 * until every attached photo has actually resolved to a Drive url (or the
 * user's removed/retried the failed ones). See Round 3 Task 8.
 */
export function countUnresolvedPhotos(photoMaps: Record<string, PhotoAsset[]>[]): {
  uploading: number;
  failed: number;
} {
  let uploading = 0;
  let failed = 0;
  for (const map of photoMaps) {
    for (const list of Object.values(map)) {
      for (const photo of list) {
        if (photo.status === "uploading") uploading++;
        else if (photo.status === "error") failed++;
      }
    }
  }
  return { uploading, failed };
}
