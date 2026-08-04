"use client";

import { AdminCardCloseButton } from "@/components/admin/admin-card-close-button";
import { AdminCardEditButton } from "@/components/admin/admin-card-edit-button";
import { AdminSaveStatusIndicator } from "@/components/admin/admin-save-status";
import { detailCardHeaderClass, detailSectionTitleClass } from "@/components/admin/appointments/appointment-detail/detail-styles";
import type { AdminSaveStatus } from "@/hooks/use-admin-autosave";
import { cn } from "@/lib/utils";

interface AdminEditableCardHeaderProps {
  title: string;
  editing: boolean;
  status: AdminSaveStatus;
  onEdit: () => void;
  onClose: () => void;
  editLabel: string;
  closeLabel?: string;
  className?: string;
}

export function AdminEditableCardHeader({
  title,
  editing,
  status,
  onEdit,
  onClose,
  editLabel,
  closeLabel,
  className,
}: AdminEditableCardHeaderProps) {
  return (
    <div
      className={cn(
        detailCardHeaderClass,
        "flex items-center justify-between gap-3",
        className
      )}
    >
      <h2 className={detailSectionTitleClass}>{title}</h2>
      <div className="flex items-center gap-1">
        {editing && <AdminSaveStatusIndicator status={status} />}
        {editing ? (
          <AdminCardCloseButton
            onClick={onClose}
            label={closeLabel ?? `Close ${title.toLowerCase()} editor`}
          />
        ) : (
          <AdminCardEditButton onClick={onEdit} label={editLabel} />
        )}
      </div>
    </div>
  );
}
