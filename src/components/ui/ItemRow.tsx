"use client";

import { Camera, Info, StickyNote } from "lucide-react";
import { useState } from "react";
import type { Condition, RubricItem } from "@/lib/types";
import { compressImage } from "@/lib/image/compress";
import { ConditionPills } from "./ConditionPills";
import { IconButton } from "./IconButton";
import { ConditionInfoPanel } from "./ConditionInfoPanel";

interface ItemRowProps {
  item: RubricItem;
  worstCase?: boolean;
  value: Condition | undefined;
  photo: File | undefined;
  note: string | undefined;
  onScoreChange: (value: Condition) => void;
  onPhotoChange: (file: File | undefined) => void;
  onNoteChange: (value: string) => void;
}

export function ItemRow({
  item,
  worstCase,
  value,
  photo,
  note,
  onScoreChange,
  onPhotoChange,
  onNoteChange,
}: ItemRowProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(Boolean(note));
  const [compressing, setCompressing] = useState(false);
  const inputId = `photo_${item.name.replace(/[^a-zA-Z0-9]/g, "_")}`;

  async function handlePhotoPick(file: File | undefined) {
    if (!file) {
      onPhotoChange(undefined);
      return;
    }
    setCompressing(true);
    try {
      onPhotoChange(await compressImage(file));
    } finally {
      setCompressing(false);
    }
  }

  return (
    <div className="py-2.5 border-b border-border">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[13.5px] font-medium text-ink">{item.name}</span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10.5px] text-ink-faint whitespace-nowrap">
            {item.weight}%{worstCase ? " · worst-case" : ""}
          </span>
          <IconButton active={infoOpen} aria-label="Rating guidance" onClick={() => setInfoOpen((v) => !v)}>
            <Info size={16} />
          </IconButton>
          <IconButton
            active={Boolean(photo)}
            aria-label="Attach photo"
            onClick={() => document.getElementById(inputId)?.click()}
            disabled={compressing}
          >
            <Camera size={16} />
          </IconButton>
          <IconButton active={noteOpen} aria-label="Add note" onClick={() => setNoteOpen((v) => !v)}>
            <StickyNote size={16} />
          </IconButton>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhotoPick(e.target.files?.[0])}
          />
        </div>
      </div>
      <ConditionPills value={value} onChange={onScoreChange} options={item.conditionOverride} />
      {compressing ? (
        <div className="text-[11px] text-ink-faint mt-1">Compressing photo…</div>
      ) : photo ? (
        <div className="text-[11px] text-ink-faint mt-1">
          Attached: {photo.name} ({(photo.size / 1024).toFixed(0)} KB)
        </div>
      ) : null}
      {noteOpen ? (
        <input
          type="text"
          placeholder="Note on this item"
          value={note ?? ""}
          onChange={(e) => onNoteChange(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-border px-2.5 py-2 text-xs"
        />
      ) : null}
      {infoOpen ? <ConditionInfoPanel category={item.category} /> : null}
    </div>
  );
}
