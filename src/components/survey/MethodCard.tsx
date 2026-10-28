import type { LucideIcon } from "lucide-react";

interface MethodCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}

export function MethodCard({ icon: Icon, title, description, onClick, disabled }: MethodCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full text-left rounded-2xl border border-border bg-card p-4 mb-3 active:border-brand disabled:opacity-50"
    >
      <div className="h-8 w-8 rounded-lg bg-brand-tint text-brand flex items-center justify-center mb-2.5">
        <Icon size={18} />
      </div>
      <div className="text-[15px] font-semibold text-ink mb-1">{title}</div>
      <div className="text-[12.5px] text-ink-soft leading-snug">{description}</div>
    </button>
  );
}
