// Pure route matching for the app shell, kept apart from the icons so it can be unit tested.

/** Destinations listed in the sidebar's Manage section; the More page is their mobile home. */
export const SECONDARY_HREFS = ["/leaves", "/reports", "/settings"] as const;

/** Routes the mobile More tab stands for. */
export const MORE_ROUTES = ["/more", "/profile", "/search", ...SECONDARY_HREFS] as const;

/** True on `href` itself and anything beneath it, but not on a sibling that shares the prefix. */
export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}

export function isMoreActive(pathname: string): boolean {
  return MORE_ROUTES.some((href) => isActive(pathname, href));
}
