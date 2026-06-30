import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-20 w-20 text-xl",
} as const;

type UserAvatarProps = {
  name: string;
  image?: string | null;
  size?: keyof typeof sizeClasses;
  className?: string;
};

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function UserAvatar({
  name,
  image,
  size = "md",
  className,
}: UserAvatarProps) {
  const sizeClass = sizeClasses[size];

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", sizeClass, className)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary",
        sizeClass,
        className,
      )}
    >
      {initialsFromName(name || "?")}
    </div>
  );
}
