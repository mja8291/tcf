"use client";

import { useEffect, useRef, useState } from "react";

// Corrected, ordered list (Task 7 addendum) — the source brief had a
// lettering typo (two items marked "d.", two marked "e."); these are the 8
// distinct instructions in order.
const INSTRUCTIONS = [
  "Try to visit every corner of the school.",
  "Keep highlighting the defective points with your counterpart surveyor.",
  "If possible visit the roof top. In case of access difficulty, send someone to bring pictures of the roof floor, rain spout, tank, and solar panels.",
  "Don't forget to check functionality of toilet fixtures.",
  "Discuss the sewage condition with janitor staff.",
  "Have a chit-chat about the school's frequent repair and maintenance issues.",
  "Try to retain in your mind a combined and dominant view for each item, until you're done with the scoring part.",
  "Look for structural issues and hazards — cracks, seepage, etc.",
];

const CYCLE_MS = 5500;
const FADE_MS = 300;

/** Rotating instruction card — one instruction visible at a time, fading to
 * the next roughly every 5-6s, looping continuously. Plain CSS opacity
 * transition + a timed interval, per the brief (no animation library, and
 * the project doesn't already use one). */
export function CampusVisitInstructions() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setVisible(false);
      fadeTimeoutRef.current = setTimeout(() => {
        setIndex((i) => (i + 1) % INSTRUCTIONS.length);
        setVisible(true);
      }, FADE_MS);
    }, CYCLE_MS);
    return () => {
      clearInterval(intervalId);
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 min-h-[96px] flex items-center justify-center text-center mb-4">
      <p
        className="text-[13.5px] text-ink leading-relaxed transition-opacity ease-in-out"
        style={{ transitionDuration: `${FADE_MS}ms`, opacity: visible ? 1 : 0 }}
      >
        {INSTRUCTIONS[index]}
      </p>
    </div>
  );
}
