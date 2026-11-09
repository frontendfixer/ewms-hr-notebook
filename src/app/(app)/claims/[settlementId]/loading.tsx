/** Shaped like the bill detail page, so it doesn't borrow the list's skeleton. */
function Block({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-muted ${className}`} />;
}

export default function ClaimDetailLoading() {
  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-3" role="status" aria-label="Loading claim">
      <div className="flex items-center gap-2 px-1">
        <Block className="h-10 w-10" />
        <div className="flex-1 space-y-1.5">
          <Block className="h-5 w-32" />
          <Block className="h-3.5 w-48" />
        </div>
        <Block className="h-6 w-16" />
      </div>
      <Block className="h-[200px]" />
      <Block className="h-[260px]" />
      <Block className="h-4 w-24" />
      <Block className="h-[140px]" />
    </div>
  );
}
