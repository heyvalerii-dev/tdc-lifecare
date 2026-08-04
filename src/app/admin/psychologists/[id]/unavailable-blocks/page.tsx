import { notFound, permanentRedirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { adminWideContainer } from "@/lib/admin-layout";
import {
  isPsychologistUuid,
  psychologistAdminPath,
} from "@/lib/psychologist-slugs";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type { Psychologist } from "@/types/database";

export default async function PsychologistUnavailableBlocksPage({
  params,
}: {
  params: Promise<{ id?: string; slug?: string }>;
}) {
  const resolved = await params;
  const slugOrId = resolved.id ?? resolved.slug;
  if (!slugOrId) notFound();

  const supabase = await createClient();

  let psychologist: Pick<Psychologist, "id" | "name" | "slug"> | null = null;
  let viaUuid = false;

  if (isPsychologistUuid(slugOrId)) {
    viaUuid = true;
    const { data } = await supabase
      .from("psychologists")
      .select("id, name, slug")
      .eq("id", slugOrId)
      .maybeSingle();
    psychologist = data;
  } else {
    const { data } = await supabase
      .from("psychologists")
      .select("id, name, slug")
      .eq("slug", slugOrId)
      .maybeSingle();
    psychologist = data;
  }

  if (!psychologist) notFound();

  if (viaUuid) {
    permanentRedirect(
      psychologistAdminPath(psychologist.slug, "/unavailable-blocks")
    );
  }

  return (
    <div className={cn(adminWideContainer, "py-6 sm:py-8")}>
      <div className="mb-8 space-y-4">
        <Link
          href={psychologistAdminPath(psychologist.slug)}
          className={cn(
            "inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-text-muted)]",
            "transition-colors duration-150 ease-out hover:text-[var(--brand-purple)]"
          )}
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
          Back to profile
        </Link>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--brand-text-muted)]/80">
            Unavailable Blocks
          </p>
          <h1 className={cn(type.pageTitle, "mt-1")}>{psychologist.name}</h1>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--brand-purple)]/[0.08] bg-white p-8 shadow-[0_4px_24px_rgba(93,80,122,0.04)]">
        <p className="text-sm leading-relaxed text-[var(--brand-text-muted)]">
          Full unavailable block history for this psychologist is coming soon.
          Use the calendar or profile page to add and review upcoming blocks.
        </p>
      </div>
    </div>
  );
}
