/** Matches the home layout so the page doesn't jump when data arrives. */
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function HomeLoading() {
  return (
    <div
      className="mx-auto min-w-0 max-w-2xl space-y-3"
      role="status"
      aria-label="Loading your dashboard"
    >
      <div className="space-y-1.5 px-1">
        <Block className="h-5 w-56" />
        <Block className="h-3.5 w-40" />
      </div>
      <Block className="h-[116px]" />
      <Block className="h-[108px]" />
      <Block className="h-[152px]" />
      <Block className="h-[148px]" />
    </div>
  );
}
