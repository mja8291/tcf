"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScreenShell } from "@/components/ui/ScreenShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { BottomBar } from "@/components/ui/BottomBar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PhotoAttachButtons, PhotoThumbList, usePhotoAttachHandler } from "@/components/ui/PhotoAttach";
import { CampusVisitInstructions } from "@/components/survey/CampusVisitInstructions";
import { useSurvey } from "@/lib/survey-context";
import { METHOD1_ITEMS } from "@/lib/data/method1-items";
import { CATEGORIES } from "@/lib/scoring";
import type { Category } from "@/lib/types";

// Matches CategoryCard.tsx's tint convention, for visual consistency with
// how the rest of Method 1 groups these same items.
const TINT: Record<Category, string> = {
  Functionality: "var(--cat-functionality-tint)",
  Safety: "var(--cat-safety-tint)",
  Aesthetics: "var(--cat-aesthetics-tint)",
};

const HIGHLIGHT_MS = 1600;

/** Stable per-item anchor id for the tag → photo-row scroll link. */
function itemAnchorId(name: string) {
  return `cv-item-${name.replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase()}`;
}

/**
 * Method 1 only (Task 7 addendum) — sits between method selection and the
 * first scoring screen. Method 1 asks for one combined judgment per item
 * after walking the whole campus, so this briefs the surveyor before that
 * walk. Method 2 doesn't get an equivalent screen — it's already
 * inherently room-by-room.
 *
 * Photos attached here write into the exact same state.m1.photos the
 * item-scoring page reads/writes (via m1AddPhoto/m1RemovePhoto) — one
 * shared list per item, visible and editable from both places.
 */
export default function CampusVisitPage() {
  const router = useRouter();
  const { state, m1AddPhoto, m1RemovePhoto, discardMethodProgress } = useSurvey();
  const [confirmBack, setConfirmBack] = useState(false);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!state.school || state.method !== 1) router.replace("/survey/find-school");
  }, [state.school, state.method, router]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    };
  }, []);

  if (!state.school) return null;

  function confirmDiscardAndGoBack() {
    discardMethodProgress();
    router.push("/survey/method");
  }

  function jumpToItem(name: string) {
    document.getElementById(itemAnchorId(name))?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    setHighlighted(name);
    highlightTimeoutRef.current = setTimeout(() => setHighlighted(null), HIGHLIGHT_MS);
  }

  return (
    <ScreenShell>
      <TopBar title="Let's have a Campus visit" onBack={() => setConfirmBack(true)} />
      <ConfirmDialog
        open={confirmBack}
        title="Discard this assessment?"
        message="Going back will discard your progress and reset the timer. Continue?"
        onConfirm={confirmDiscardAndGoBack}
        onCancel={() => setConfirmBack(false)}
      />

      <CampusVisitInstructions />

      {CATEGORIES.map((cat) => (
        <div key={cat} className="mb-3">
          <div className="text-[11px] font-semibold text-ink-faint uppercase tracking-wide mb-1.5">{cat}</div>
          <div className="flex flex-wrap gap-1.5">
            {METHOD1_ITEMS.filter((i) => i.category === cat).map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => jumpToItem(item.name)}
                className="rounded-full px-2.5 py-1 text-[11px] font-medium text-ink cursor-pointer"
                style={{ background: TINT[cat] }}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mb-2">
        <div className="text-xs font-semibold text-brand-deep uppercase tracking-wide mb-2">
          Attach photos (optional)
        </div>
        {METHOD1_ITEMS.map((item) => (
          <CampusVisitPhotoRow
            key={item.name}
            itemName={item.name}
            photos={state.m1.photos[item.name] ?? []}
            highlighted={highlighted === item.name}
            onAdd={(file) => m1AddPhoto(item.name, file)}
            onRemove={(index) => m1RemovePhoto(item.name, index)}
          />
        ))}
      </div>

      <BottomBar>
        <Button onClick={() => router.push("/survey/m1")}>Continue to scoring</Button>
      </BottomBar>
    </ScreenShell>
  );
}

function CampusVisitPhotoRow({
  itemName,
  photos,
  highlighted,
  onAdd,
  onRemove,
}: {
  itemName: string;
  photos: File[];
  highlighted: boolean;
  onAdd: (file: File) => void;
  onRemove: (index: number) => void;
}) {
  const { compressing, handlePick } = usePhotoAttachHandler(onAdd);
  return (
    <div
      id={itemAnchorId(itemName)}
      className={`flex items-center justify-between gap-2 py-2 border-b border-border rounded-lg transition-colors duration-300 ${
        highlighted ? "bg-brand-tint ring-2 ring-brand" : ""
      }`}
    >
      <div className="flex-1 min-w-0 px-1">
        <span className="block truncate text-[12.5px] text-ink">{itemName}</span>
        {compressing ? <div className="text-[10.5px] text-ink-faint mt-0.5">Compressing photo…</div> : null}
        <PhotoThumbList photos={photos} onRemovePhoto={onRemove} />
      </div>
      <PhotoAttachButtons itemKey={itemName} photoCount={photos.length} compressing={compressing} onPick={handlePick} />
    </div>
  );
}
