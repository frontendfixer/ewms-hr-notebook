import { redirect } from "next/navigation";
import { recordsRedirectHref } from "@/lib/timeline-filters";

/** Kept so old links and bookmarks still land somewhere: records now live on the timeline. */
export default async function RecordsIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  redirect(recordsRedirectHref("all", filter));
}
