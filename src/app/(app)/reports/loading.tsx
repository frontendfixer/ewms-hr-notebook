/** Matches the reports layout so the page doesn't jump when data arrives. */
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function ReportsLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3" role="status" aria-label="Loading reports">
      <div className="flex items-center justify-between px-1">
        <Block className="h-5 w-24" />
        <Block className="h-8 w-40" />
      </div>
      <Block className="h-11" />
      <Block className="h-[292px]" />
      <Block className="h-[200px]" />
      <Block className="h-[160px]" />
      <Block className="h-12" />
      <Block className="h-[150px]" />
    </div>
  );
}
