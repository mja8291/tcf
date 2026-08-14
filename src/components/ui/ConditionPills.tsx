"use client";

import { CONDITIONS } from "@/lib/scoring";
import type { Condition } from "@/lib/types";

interface ConditionPillsProps {
  value: Condition | undefined;
  onChange: (value: Condition) => void;
  /** From RubricItem.conditionOverride — restricts + relabels the pills for items with fewer rubric states. N/A is always appended. */
  options?: { condition: Exclude<Condition, "N/A">; label: string }[];
}

export function ConditionPills({ value, onChange, options }: ConditionPillsProps) {
  const pills: { condition: Condition; label: string }[] = options
    ? [...options, { condition: "N/A", label: "N/A" }]
    : CONDITIONS.map((c) => ({ condition: c, label: c }));

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map(({ condition, label }) => {
        const active = value === condition;
        return (
          <button
            key={condition}
            type="button"
            onClick={() => onChange(condition)}
            className={`min-h-10 inline-flex items-center rounded-full border px-3.5 text-[12.5px] ${
              active ? "bg-brand border-brand text-white" : "bg-white border-border text-ink-soft"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
