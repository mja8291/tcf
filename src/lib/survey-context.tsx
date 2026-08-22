"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type {
  Condition,
  FloorLevel,
  LocationType,
  Method2Location,
  PhotoAsset,
  PowerSupply,
  School,
  WorkCategory,
} from "@/lib/types";
import { UNNAMED_LOCATION_TYPES } from "@/lib/data/method2-items";

interface M2Current {
  floorLevel: FloorLevel;
  type: LocationType | null;
  name: string;
  classroomGrade?: string;
  classroomSection?: string;
  activeWorkCategory: WorkCategory | null;
  scores: Record<string, Condition>;
  /** Multiple photos per item are allowed. Each uploads to Drive individually on attach — see PhotoAsset. */
  photos: Record<string, PhotoAsset[]>;
  notes: Record<string, string>;
}

interface SurveyState {
  school: School | null;
  method: 1 | 2 | null;
  asm: string;
  apm: string;
  principal: string;
  powerSupply: PowerSupply | "";
  complaints: string;
  m1: {
    scores: Record<string, Condition>;
    /** Multiple photos per item are allowed. Each uploads to Drive individually on attach — see PhotoAsset. */
    photos: Record<string, PhotoAsset[]>;
    notes: Record<string, string>;
  };
  m2: {
    locations: Method2Location[];
    current: M2Current | null;
  };
  /**
   * Set the moment a method is chosen, alongside startTime — every photo
   * uploaded during this attempt (Round 3 Task 8) carries this same id in
   * its Drive folder path, and the final submit's response/attachment rows
   * must reuse the exact same id so photos correlate back to their survey
   * row. Regenerated fresh on every SET_METHOD, same lifecycle as startTime.
   */
  surveyId: string | null;
  /** Set right after a successful (non-queued) submit, so the Done screen can offer downloads. */
  lastSurveyId: string | null;
  /** ISO timestamp set the moment a method is chosen (not on page load, not on first item answered). Cleared if the user discards progress and goes back to method selection. */
  startTime: string | null;
  /** ISO timestamp of the most recent pause, while paused; null once resumed (or if never paused). */
  pausedAt: string | null;
  /** Seconds accumulated across every *completed* pause span. Does not include a currently-open pause — see pausedAt. */
  pausedSeconds: number;
}

function newSurveyId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `survey-${Date.now()}`;
}

function initialState(): SurveyState {
  return {
    school: null,
    method: null,
    asm: "",
    apm: "",
    principal: "",
    powerSupply: "",
    complaints: "",
    m1: { scores: {}, photos: {}, notes: {} },
    m2: { locations: [], current: null },
    surveyId: null,
    lastSurveyId: null,
    startTime: null,
    pausedAt: null,
    pausedSeconds: 0,
  };
}

// Small pure helpers so the M1/add-status-remove trio doesn't repeat the
// same Record<string, PhotoAsset[]> plumbing four times over (M1 + M2
// current each need add/status-update/remove).
function addPhoto(photos: Record<string, PhotoAsset[]>, name: string, asset: PhotoAsset): Record<string, PhotoAsset[]> {
  return { ...photos, [name]: [...(photos[name] ?? []), asset] };
}
function setPhotoStatus(
  photos: Record<string, PhotoAsset[]>,
  name: string,
  id: string,
  status: PhotoAsset["status"],
  url?: string
): Record<string, PhotoAsset[]> {
  return {
    ...photos,
    [name]: (photos[name] ?? []).map((p) => (p.id === id ? { ...p, status, url: url ?? p.url } : p)),
  };
}
function removePhoto(photos: Record<string, PhotoAsset[]>, name: string, id: string): Record<string, PhotoAsset[]> {
  return { ...photos, [name]: (photos[name] ?? []).filter((p) => p.id !== id) };
}

function emptyM2Current(floorLevel: FloorLevel): M2Current {
  return { floorLevel, type: null, name: "", activeWorkCategory: null, scores: {}, photos: {}, notes: {} };
}

type Action =
  | { type: "SET_SCHOOL"; school: School }
  | { type: "SET_METHOD"; method: 1 | 2 }
  | { type: "SET_RESPONDENT"; asm: string; apm: string; principal: string }
  | { type: "SET_POWER_SUPPLY"; value: PowerSupply }
  | { type: "SET_COMPLAINTS"; value: string }
  | { type: "SET_LAST_SURVEY_ID"; surveyId: string | null }
  | { type: "M1_SET_SCORE"; name: string; value: Condition }
  | { type: "M1_ADD_PHOTO"; name: string; id: string; file: File }
  | { type: "M1_PHOTO_STATUS"; name: string; id: string; status: PhotoAsset["status"]; url?: string }
  | { type: "M1_REMOVE_PHOTO"; name: string; id: string }
  | { type: "M1_SET_NOTE"; name: string; value: string }
  | { type: "M2_SET_FLOOR"; floorLevel: FloorLevel; autoName?: string }
  | { type: "M2_SET_LOCATION_TYPE"; floorLevel: FloorLevel; locationType: LocationType; autoName?: string }
  | { type: "M2_SET_LOCATION_NAME"; name: string }
  | { type: "M2_SET_CLASSROOM"; floorLevel: FloorLevel; grade: string; section: string }
  | { type: "M2_OPEN_CATEGORY"; workCategory: WorkCategory }
  | { type: "M2_CURRENT_SET_SCORE"; name: string; value: Condition }
  | { type: "M2_CURRENT_ADD_PHOTO"; name: string; id: string; file: File }
  | { type: "M2_CURRENT_PHOTO_STATUS"; name: string; id: string; status: PhotoAsset["status"]; url?: string }
  | { type: "M2_CURRENT_REMOVE_PHOTO"; name: string; id: string }
  | { type: "M2_CURRENT_SET_NOTE"; name: string; value: string }
  | { type: "M2_FINALIZE_CURRENT" }
  | { type: "M2_RESUME_LOCATION"; id: string }
  | { type: "DISCARD_METHOD_PROGRESS" }
  | { type: "PAUSE_TIMER" }
  | { type: "RESUME_TIMER" }
  | { type: "RESET" };

function resumeNow(state: SurveyState): SurveyState {
  if (!state.pausedAt) return state;
  const openPauseSeconds = (Date.now() - new Date(state.pausedAt).getTime()) / 1000;
  return { ...state, pausedAt: null, pausedSeconds: state.pausedSeconds + openPauseSeconds };
}

// Actions that don't count as "doing the assessment" — picking a school or
// method, discarding/resetting everything, and the pause/resume actions
// themselves (which manage pausedAt directly and would otherwise conflict
// with the auto-resume below).
const TIMER_EXEMPT_ACTIONS = new Set<Action["type"]>([
  "SET_SCHOOL",
  "SET_METHOD",
  "SET_LAST_SURVEY_ID",
  "DISCARD_METHOD_PROGRESS",
  "PAUSE_TIMER",
  "RESUME_TIMER",
  "RESET",
]);

function reducer(state: SurveyState, action: Action): SurveyState {
  // Auto-resume on any real interaction while paused — picking a condition,
  // typing a note, choosing a floor/location/work category, editing
  // respondent details, etc. — so a forgotten "Resume" tap doesn't quietly
  // keep excluding real working time from the tally. The explicit
  // Pause/Resume button still exists for someone who wants to resume
  // without doing anything else yet.
  if (state.pausedAt && !TIMER_EXEMPT_ACTIONS.has(action.type)) {
    state = resumeNow(state);
  }

  switch (action.type) {
    case "SET_SCHOOL":
      return { ...state, school: action.school };
    case "SET_METHOD":
      // startTime is set here, not on page load or first item answered — the
      // moment a method is actually chosen is what "starting the assessment"
      // means. surveyId is minted here too (Round 3 Task 8) — every photo
      // uploaded from here on carries this id in its Drive path, and submit
      // must reuse the exact same id so photos correlate back to their row.
      return {
        ...state,
        method: action.method,
        surveyId: newSurveyId(),
        startTime: new Date().toISOString(),
        pausedAt: null,
        pausedSeconds: 0,
      };
    case "SET_RESPONDENT":
      return { ...state, asm: action.asm, apm: action.apm, principal: action.principal };
    case "SET_POWER_SUPPLY":
      return { ...state, powerSupply: action.value };
    case "SET_COMPLAINTS":
      return { ...state, complaints: action.value };
    case "SET_LAST_SURVEY_ID":
      return { ...state, lastSurveyId: action.surveyId };
    case "M1_SET_SCORE":
      return { ...state, m1: { ...state.m1, scores: { ...state.m1.scores, [action.name]: action.value } } };
    case "M1_ADD_PHOTO": {
      const photos = addPhoto(state.m1.photos, action.name, { id: action.id, file: action.file, status: "uploading" });
      return { ...state, m1: { ...state.m1, photos } };
    }
    case "M1_PHOTO_STATUS": {
      const photos = setPhotoStatus(state.m1.photos, action.name, action.id, action.status, action.url);
      return { ...state, m1: { ...state.m1, photos } };
    }
    case "M1_REMOVE_PHOTO": {
      const photos = removePhoto(state.m1.photos, action.name, action.id);
      return { ...state, m1: { ...state.m1, photos } };
    }
    case "M1_SET_NOTE":
      return { ...state, m1: { ...state.m1, notes: { ...state.m1.notes, [action.name]: action.value } } };

    case "M2_SET_FLOOR": {
      const current = emptyM2Current(action.floorLevel);
      // Roof floor has no Location page — it *is* the location type, auto-named.
      if (action.floorLevel === "Roof") {
        current.type = "Roof";
        current.name = action.autoName ?? "Roof";
      }
      return { ...state, m2: { ...state.m2, current } };
    }
    case "M2_SET_LOCATION_TYPE": {
      // Always builds a fresh current from the explicit floorLevel — doesn't
      // depend on a pre-existing current, so there's no ordering/timing
      // dependency on whatever the previous screen last set.
      const named = UNNAMED_LOCATION_TYPES.includes(action.locationType);
      const current = emptyM2Current(action.floorLevel);
      current.type = action.locationType;
      current.name = named ? (action.autoName ?? action.locationType) : "";
      return { ...state, m2: { ...state.m2, current } };
    }
    case "M2_SET_LOCATION_NAME":
      return state.m2.current
        ? { ...state, m2: { ...state.m2, current: { ...state.m2.current, name: action.name } } }
        : state;
    case "M2_SET_CLASSROOM": {
      const current = emptyM2Current(action.floorLevel);
      current.type = "Classroom";
      current.classroomGrade = action.grade;
      current.classroomSection = action.section;
      current.name = `${action.grade} ${action.section}`;
      return { ...state, m2: { ...state.m2, current } };
    }
    case "M2_OPEN_CATEGORY":
      return state.m2.current
        ? { ...state, m2: { ...state.m2, current: { ...state.m2.current, activeWorkCategory: action.workCategory } } }
        : state;
    case "M2_CURRENT_SET_SCORE":
      return state.m2.current
        ? {
            ...state,
            m2: {
              ...state.m2,
              current: { ...state.m2.current, scores: { ...state.m2.current.scores, [action.name]: action.value } },
            },
          }
        : state;
    case "M2_CURRENT_ADD_PHOTO": {
      if (!state.m2.current) return state;
      const photos = addPhoto(state.m2.current.photos, action.name, {
        id: action.id,
        file: action.file,
        status: "uploading",
      });
      return { ...state, m2: { ...state.m2, current: { ...state.m2.current, photos } } };
    }
    case "M2_CURRENT_PHOTO_STATUS": {
      if (!state.m2.current) return state;
      const photos = setPhotoStatus(state.m2.current.photos, action.name, action.id, action.status, action.url);
      return { ...state, m2: { ...state.m2, current: { ...state.m2.current, photos } } };
    }
    case "M2_CURRENT_REMOVE_PHOTO": {
      if (!state.m2.current) return state;
      const photos = removePhoto(state.m2.current.photos, action.name, action.id);
      return { ...state, m2: { ...state.m2, current: { ...state.m2.current, photos } } };
    }
    case "M2_CURRENT_SET_NOTE":
      return state.m2.current
        ? {
            ...state,
            m2: {
              ...state.m2,
              current: { ...state.m2.current, notes: { ...state.m2.current.notes, [action.name]: action.value } },
            },
          }
        : state;
    case "M2_FINALIZE_CURRENT": {
      const current = state.m2.current;
      if (!current || !current.type || Object.keys(current.scores).length === 0) {
        // Nothing scored yet at this location — nothing to keep.
        return { ...state, m2: { ...state.m2, current: null } };
      }
      const location: Method2Location = {
        id: `${current.type}-${Date.now()}`,
        floorLevel: current.floorLevel,
        type: current.type,
        name: current.name,
        classroomGrade: current.classroomGrade,
        classroomSection: current.classroomSection,
        scores: current.scores,
        photos: current.photos,
        notes: current.notes,
      };
      return { ...state, m2: { ...state.m2, locations: [...state.m2.locations, location], current: null } };
    }
    case "M2_RESUME_LOCATION": {
      // Pulls a previously-finalized location back into `current` for
      // editing — the only way to fix an incomplete location (added
      // alongside Task 3's submit-blocking validation: without this, an
      // incomplete location had no path back to completion and would
      // permanently block submission).
      const location = state.m2.locations.find((l) => l.id === action.id);
      if (!location) return state;
      const current: M2Current = {
        floorLevel: location.floorLevel,
        type: location.type,
        name: location.name,
        classroomGrade: location.classroomGrade,
        classroomSection: location.classroomSection,
        activeWorkCategory: null,
        scores: location.scores,
        photos: location.photos,
        notes: location.notes,
      };
      return {
        ...state,
        m2: { locations: state.m2.locations.filter((l) => l.id !== action.id), current },
      };
    }
    case "PAUSE_TIMER":
      // No-op if the timer isn't running yet, or is already paused — avoids
      // clobbering an earlier pausedAt (which would lose the time already
      // accrued in the open span) on a duplicate click.
      if (!state.startTime || state.pausedAt) return state;
      return { ...state, pausedAt: new Date().toISOString() };
    case "RESUME_TIMER":
      return resumeNow(state);
    case "DISCARD_METHOD_PROGRESS":
      // Confirmed navigation back to method selection: clear every response
      // entered in this session and the timer — but not school/respondent
      // details (re-typing names would be bad UX for the same screen
      // they're landing back on), and deliberately *not* `method` either:
      // nulling it here races the m1/m2 pages' own "state.method !== N"
      // guard effect, which fires on the same still-mounted page before our
      // router.push("/survey/method") completes and redirects to
      // find-school instead. Leaving it as-is is harmless — setMethod
      // overwrites it the moment they pick again on that screen.
      return {
        ...state,
        m1: { scores: {}, photos: {}, notes: {} },
        m2: { locations: [], current: null },
        startTime: null,
        pausedAt: null,
        pausedSeconds: 0,
      };
    case "RESET":
      return initialState();
    default:
      return state;
  }
}

interface SurveyContextValue {
  state: SurveyState;
  setSchool: (school: School) => void;
  setMethod: (method: 1 | 2) => void;
  setRespondent: (asm: string, apm: string, principal: string) => void;
  setPowerSupply: (value: PowerSupply) => void;
  setComplaints: (value: string) => void;
  setLastSurveyId: (surveyId: string | null) => void;
  m1SetScore: (name: string, value: Condition) => void;
  m1AddPhoto: (name: string, id: string, file: File) => void;
  m1SetPhotoStatus: (name: string, id: string, status: PhotoAsset["status"], url?: string) => void;
  m1RemovePhoto: (name: string, id: string) => void;
  m1SetNote: (name: string, value: string) => void;
  m2SetFloor: (floorLevel: FloorLevel, autoName?: string) => void;
  m2SetLocationType: (floorLevel: FloorLevel, locationType: LocationType, autoName?: string) => void;
  m2SetLocationName: (name: string) => void;
  m2SetClassroom: (floorLevel: FloorLevel, grade: string, section: string) => void;
  m2OpenCategory: (workCategory: WorkCategory) => void;
  m2CurrentSetScore: (name: string, value: Condition) => void;
  m2CurrentAddPhoto: (name: string, id: string, file: File) => void;
  m2CurrentSetPhotoStatus: (name: string, id: string, status: PhotoAsset["status"], url?: string) => void;
  m2CurrentRemovePhoto: (name: string, id: string) => void;
  m2CurrentSetNote: (name: string, value: string) => void;
  m2FinalizeCurrent: () => void;
  m2ResumeLocation: (id: string) => void;
  discardMethodProgress: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  reset: () => void;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const value = useMemo<SurveyContextValue>(
    () => ({
      state,
      setSchool: (school) => dispatch({ type: "SET_SCHOOL", school }),
      setMethod: (method) => dispatch({ type: "SET_METHOD", method }),
      setRespondent: (asm, apm, principal) => dispatch({ type: "SET_RESPONDENT", asm, apm, principal }),
      setPowerSupply: (value) => dispatch({ type: "SET_POWER_SUPPLY", value }),
      setComplaints: (value) => dispatch({ type: "SET_COMPLAINTS", value }),
      setLastSurveyId: (surveyId) => dispatch({ type: "SET_LAST_SURVEY_ID", surveyId }),
      m1SetScore: (name, value) => dispatch({ type: "M1_SET_SCORE", name, value }),
      m1AddPhoto: (name, id, file) => dispatch({ type: "M1_ADD_PHOTO", name, id, file }),
      m1SetPhotoStatus: (name, id, status, url) => dispatch({ type: "M1_PHOTO_STATUS", name, id, status, url }),
      m1RemovePhoto: (name, id) => dispatch({ type: "M1_REMOVE_PHOTO", name, id }),
      m1SetNote: (name, value) => dispatch({ type: "M1_SET_NOTE", name, value }),
      m2SetFloor: (floorLevel, autoName) => dispatch({ type: "M2_SET_FLOOR", floorLevel, autoName }),
      m2SetLocationType: (floorLevel, locationType, autoName) =>
        dispatch({ type: "M2_SET_LOCATION_TYPE", floorLevel, locationType, autoName }),
      m2SetLocationName: (name) => dispatch({ type: "M2_SET_LOCATION_NAME", name }),
      m2SetClassroom: (floorLevel, grade, section) => dispatch({ type: "M2_SET_CLASSROOM", floorLevel, grade, section }),
      m2OpenCategory: (workCategory) => dispatch({ type: "M2_OPEN_CATEGORY", workCategory }),
      m2CurrentSetScore: (name, value) => dispatch({ type: "M2_CURRENT_SET_SCORE", name, value }),
      m2CurrentAddPhoto: (name, id, file) => dispatch({ type: "M2_CURRENT_ADD_PHOTO", name, id, file }),
      m2CurrentSetPhotoStatus: (name, id, status, url) =>
        dispatch({ type: "M2_CURRENT_PHOTO_STATUS", name, id, status, url }),
      m2CurrentRemovePhoto: (name, id) => dispatch({ type: "M2_CURRENT_REMOVE_PHOTO", name, id }),
      m2CurrentSetNote: (name, value) => dispatch({ type: "M2_CURRENT_SET_NOTE", name, value }),
      m2FinalizeCurrent: () => dispatch({ type: "M2_FINALIZE_CURRENT" }),
      m2ResumeLocation: (id) => dispatch({ type: "M2_RESUME_LOCATION", id }),
      discardMethodProgress: () => dispatch({ type: "DISCARD_METHOD_PROGRESS" }),
      pauseTimer: () => dispatch({ type: "PAUSE_TIMER" }),
      resumeTimer: () => dispatch({ type: "RESUME_TIMER" }),
      reset: () => dispatch({ type: "RESET" }),
    }),
    [state]
  );

  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
}

export function useSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("useSurvey must be used within SurveyProvider");
  return ctx;
}
