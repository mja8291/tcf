export function ScreenShell({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-md mx-auto min-h-screen flex flex-col bg-surface px-5 pt-5">{children}</div>;
}
