export default function AppLoading() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <div className="h-8 w-48 animate-pulse bg-muted" />
      <div className="h-24 w-full animate-pulse bg-muted" />
      <div className="h-40 w-full animate-pulse bg-muted" />
    </div>
  );
}
