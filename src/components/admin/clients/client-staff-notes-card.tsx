"use client";

import { useRouter } from "next/navigation";
import {
  NotesTimeline,
  type TimelineNote,
} from "@/components/admin/notes-timeline";

interface ClientStaffNotesCardProps {
  clientId: string;
  notes: TimelineNote[];
}

export function ClientStaffNotesCard({
  clientId,
  notes,
}: ClientStaffNotesCardProps) {
  const router = useRouter();

  return (
    <NotesTimeline
      title="Staff Notes"
      notes={notes}
      emptyTitle="No staff notes yet"
      emptyDescription="Keep your team informed by adding important observations, reminders, or follow-up notes for this client."
      canDelete
      onAdd={async (body) => {
        const res = await fetch("/api/admin/staff-notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entityType: "client",
            entityId: clientId,
            body,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Couldn't add note"
          );
        }
        router.refresh();
      }}
      onDelete={async (id) => {
        const res = await fetch(`/api/admin/staff-notes/${id}`, {
          method: "DELETE",
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Couldn't delete note"
          );
        }
        router.refresh();
      }}
    />
  );
}
