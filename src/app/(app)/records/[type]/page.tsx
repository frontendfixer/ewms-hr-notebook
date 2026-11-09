import { redirect } from "next/navigation";
import { recordsRedirectHref } from "@/lib/timeline-filters";

/** Kept so old links and bookmarks still land somewhere: records now live on the timeline. */
export default async function RecordsRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ filter?: string }>;
}) {
  const [{ type }, { filter }] = await Promise.all([params, searchParams]);
  redirect(recordsRedirectHref(type, filter));
}
