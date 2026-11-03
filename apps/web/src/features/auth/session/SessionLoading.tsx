export function SessionLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-screen items-center justify-center">
      <span className="text-sm text-slate-500">Checking your session…</span>
    </div>
  );
}
