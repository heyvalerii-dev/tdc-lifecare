export function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#E8E2F2]" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-[#FCFAFF] px-3 text-xs font-medium text-[var(--brand-text-muted)]">
          or
        </span>
      </div>
    </div>
  );
}
