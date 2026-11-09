/** Matches the claims layout so the page doesn't jump when data arrives. */
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function ClaimsLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3" role="status" aria-label="Loading claims">
      <Block className="h-5 w-20" />
      <Block className="h-[232px]" />
      <Block className="h-11" />
      <Block className="h-4 w-32" />
      <Block className="h-[136px]" />
      <Block className="h-[136px]" />
    </div>
  );
}
