"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import type { Condition, LocationType, Method2Location, PowerSupply, School } from "@/lib/types";

interface M2Current {
  type: LocationType;
  name: string;
  scores: Record<string, Condition>;
  photos: Record<string, File>;
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
    photos: Record<string, File>;
    notes: Record<string, string>;
  };
  m2: {
    locations: Method2Location[];
    current: M2Current | null;
  };
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
  };
}

type Action =
  | { type: "SET_SCHOOL"; school: School }
  | { type: "SET_METHOD"; method: 1 | 2 }
  | { type: "SET_RESPONDENT"; asm: string; apm: string; principal: string }
  | { type: "SET_POWER_SUPPLY"; value: PowerSupply }
  | { type: "SET_COMPLAINTS"; value: string }
  | { type: "M1_SET_SCORE"; name: string; value: Condition }
  | { type: "M1_SET_PHOTO"; name: string; file: File | undefined }
  | { type: "M1_SET_NOTE"; name: string; value: string }
  | { type: "M2_OPEN_TYPE"; locationType: LocationType }
  | { type: "M2_SET_NAME"; name: string }
  | { type: "M2_CURRENT_SET_SCORE"; name: string; value: Condition }
  | { type: "M2_CURRENT_SET_PHOTO"; name: string; file: File | undefined }
  | { type: "M2_CURRENT_SET_NOTE"; name: string; value: string }
  | { type: "M2_SAVE_CURRENT" }
  | { type: "RESET" };

function reducer(state: SurveyState, action: Action): SurveyState {
  switch (action.type) {
    case "SET_SCHOOL":
      return { ...state, school: action.school };
    case "SET_METHOD":
      return { ...state, method: action.method };
    case "SET_RESPONDENT":
      return { ...state, asm: action.asm, apm: action.apm, principal: action.principal };
    case "SET_POWER_SUPPLY":
      return { ...state, powerSupply: action.value };
    case "SET_COMPLAINTS":
      return { ...state, complaints: action.value };
    case "M1_SET_SCORE":
      return { ...state, m1: { ...state.m1, scores: { ...state.m1.scores, [action.name]: action.value } } };
    case "M1_SET_PHOTO": {
      const photos = { ...state.m1.photos };
      if (action.file) photos[action.name] = action.file;
      else delete photos[action.name];
      return { ...state, m1: { ...state.m1, photos } };
    }
    case "M1_SET_NOTE":
      return { ...state, m1: { ...state.m1, notes: { ...state.m1.notes, [action.name]: action.value } } };
    case "M2_OPEN_TYPE":
      return {
        ...state,
        m2: { ...state.m2, current: { type: action.locationType, name: "", scores: {}, photos: {}, notes: {} } },
      };
    case "M2_SET_NAME":
      return state.m2.current
        ? { ...state, m2: { ...state.m2, current: { ...state.m2.current, name: action.name } } }
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
    case "M2_CURRENT_SET_PHOTO": {
      if (!state.m2.current) return state;
      const photos = { ...state.m2.current.photos };
      if (action.file) photos[action.name] = action.file;
      else delete photos[action.name];
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
    case "M2_SAVE_CURRENT": {
      const current = state.m2.current;
      if (!current) return state;
      const countOfType = state.m2.locations.filter((l) => l.type === current.type).length;
      const location: Method2Location = {
        id: `${current.type}-${Date.now()}`,
        type: current.type,
        name: current.name.trim() || `${current.type} ${countOfType + 1}`,
        scores: current.scores,
        photos: current.photos,
        notes: current.notes,
      };
      return { ...state, m2: { ...state.m2, locations: [...state.m2.locations, location], current: null } };
    }
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
  m1SetScore: (name: string, value: Condition) => void;
  m1SetPhoto: (name: string, file: File | undefined) => void;
  m1SetNote: (name: string, value: string) => void;
  m2OpenType: (locationType: LocationType) => void;
  m2SetName: (name: string) => void;
  m2CurrentSetScore: (name: string, value: Condition) => void;
  m2CurrentSetPhoto: (name: string, file: File | undefined) => void;
  m2CurrentSetNote: (name: string, value: string) => void;
  m2SaveCurrent: () => void;
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
      m1SetScore: (name, value) => dispatch({ type: "M1_SET_SCORE", name, value }),
      m1SetPhoto: (name, file) => dispatch({ type: "M1_SET_PHOTO", name, file }),
      m1SetNote: (name, value) => dispatch({ type: "M1_SET_NOTE", name, value }),
      m2OpenType: (locationType) => dispatch({ type: "M2_OPEN_TYPE", locationType }),
      m2SetName: (name) => dispatch({ type: "M2_SET_NAME", name }),
      m2CurrentSetScore: (name, value) => dispatch({ type: "M2_CURRENT_SET_SCORE", name, value }),
      m2CurrentSetPhoto: (name, file) => dispatch({ type: "M2_CURRENT_SET_PHOTO", name, file }),
      m2CurrentSetNote: (name, value) => dispatch({ type: "M2_CURRENT_SET_NOTE", name, value }),
      m2SaveCurrent: () => dispatch({ type: "M2_SAVE_CURRENT" }),
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
