import { cn } from '@/lib/utils';

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-muted',
        className
      )}
      {...props}
    />
  );
}

export function TrackSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl border border-border bg-card">
      <Skeleton className="w-24 h-24 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-28 rounded-xl shrink-0" />
    </div>
  );
}

export function PlaylistSkeleton() {
  return (
    <div className="space-y-3">
      {["track-1", "track-2", "track-3", "track-4", "track-5"].map((key) => (
        <TrackSkeleton key={key} />
      ))}
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <section className="pt-24 pb-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-6 w-40 rounded-full" />
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-5 w-80" />
      </div>
    </section>
  );
}

export { Skeleton };
