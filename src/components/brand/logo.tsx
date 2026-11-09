import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The EWMS mark: the "train_2_fill" icon (MingCute). Keep in sync with GLYPH in
 * scripts/generate-brand-assets.sh, which builds the favicons and app icons.
 */
export const LOGO_GLYPH_PATH =
  "M17,2 C19.2091,2 21,3.79086 21,6 L21,15 C21,16.9094 19.6621,18.5063 17.8727,18.9045 L19.6,20.2 C20.0418,20.5314 20.1314,21.1582 19.8,21.6 C19.4686,22.0418 18.8418,22.1314 18.4,21.8 L14.6667,19 L9.33333,19 L5.6,21.8 C5.15817,22.1314 4.53137,22.0418 4.2,21.6 C3.86863,21.1582 3.95817,20.5314 4.4,20.2 L6.12731,18.9045 C4.33785,18.5063 3,16.9094 3,15 L3,6 C3,3.79086 4.79086,2 7,2 L17,2 Z M8.25,13.25 C7.55964,13.25 7,13.8096 7,14.5 C7,15.1904 7.55964,15.75 8.25,15.75 C8.94036,15.75 9.5,15.1904 9.5,14.5 C9.5,13.8096 8.94036,13.25 8.25,13.25 Z M15.75,13.25 C15.0596,13.25 14.5,13.8096 14.5,14.5 C14.5,15.1904 15.0596,15.75 15.75,15.75 C16.4404,15.75 17,15.1904 17,14.5 C17,13.8096 16.4404,13.25 15.75,13.25 Z M16.5,5 L7.5,5 C6.72030118,5 6.079551,5.59488554 6.00686655,6.35553954 L6,6.5 L6,9.5 C6,10.2796706 6.59488554,10.9204457 7.35553954,10.9931332 L7.5,11 L16.5,11 C17.2796706,11 17.9204457,10.4050879 17.9931332,9.64445577 L18,9.5 L18,6.5 C18,5.72030118 17.4050879,5.079551 16.6444558,5.00686655 L16.5,5 Z M16,7 L16,9 L8,9 L8,7 L16,7 Z";

/** The bare glyph in the current text colour. */
export function LogoGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path fillRule="nonzero" d={LOGO_GLYPH_PATH} />
    </svg>
  );
}

const TILE_SIZES = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-10 w-10 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
  xl: "h-20 w-20 rounded-[1.4rem]",
} as const;

export type LogoSize = keyof typeof TILE_SIZES;

/** The mark on its blue tile: the same artwork as the favicon and app icons. */
export function LogoTile({ size = "md", className }: { size?: LogoSize; className?: string }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br from-[#3b82f6] to-[#1d4ed8] text-white shadow-md shadow-[#1d4ed8]/25",
        TILE_SIZES[size],
        className,
      )}
    >
      <LogoGlyph className="h-[72%] w-[72%]" />
    </span>
  );
}

/** Tile plus the name, optionally with the tagline; links home unless `href` is null. */
export function Logo({
  size = "md",
  tagline = false,
  href = "/home",
  className,
}: {
  size?: LogoSize;
  tagline?: boolean;
  href?: string | null;
  className?: string;
}) {
  const body = (
    <>
      <LogoTile size={size} />
      <span>
        <span className="block text-base font-bold leading-tight tracking-tight">EWMS</span>
        {tagline && (
          <span className="block text-xs text-muted-foreground">Personal HR Notebook</span>
        )}
      </span>
    </>
  );
  const classes = cn("flex items-center gap-3", className);
  return href ? (
    <Link href={href} aria-label="EWMS home" className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
