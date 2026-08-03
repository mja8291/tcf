"use client";

import { CONDITIONS } from "@/lib/scoring";
import type { Condition } from "@/lib/types";

interface ConditionPillsProps {
  value: Condition | undefined;
  onChange: (value: Condition) => void;
}

export function ConditionPills({ value, onChange }: ConditionPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {CONDITIONS.map((c) => {
        const active = value === c;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`min-h-10 inline-flex items-center rounded-full border px-3.5 text-[12.5px] ${
              active ? "bg-brand border-brand text-white" : "bg-white border-border text-ink-soft"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
