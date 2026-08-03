import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "w-full min-h-11 rounded-xl px-5 py-3 text-sm font-semibold text-center transition-colors disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-brand text-white disabled:bg-border disabled:text-ink-faint",
    ghost: "bg-transparent text-brand-deep border border-border disabled:text-ink-faint",
  };
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
