export function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 mt-4 pt-4 pb-5 bg-surface border-t border-border">
      {children}
    </div>
  );
}
