"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LayoutList,
} from "lucide-react";
import { AppointmentsCalendarView } from "@/components/admin/appointments/appointments-calendar-view";
import { AppointmentsListView } from "@/components/admin/appointments/appointments-list-view";
import { CalendarMobileDateButton } from "@/components/admin/appointments/calendar-mobile-date-button";
import { CalendarMobilePsychologistSelect } from "@/components/admin/appointments/calendar-mobile-psychologist-select";
import { CalendarStatusLegend } from "@/components/admin/appointments/calendar-status-legend";
import {
  filterWorkingDays,
  formatWeekRange,
  getWeekDays,
  getWeekStartMonday,
  shiftWeek,
  toClinicDateString,
} from "@/lib/admin-calendar";
import { getClinicToday } from "@/lib/datetime";
import { parseClinicDate } from "@/components/ui/single-date-calendar";
import { adminControlRadius } from "@/lib/admin-controls";
import { type } from "@/lib/typography";
import { cn } from "@/lib/utils";
import type {
  AppointmentWithRelations,
  AvailabilityBlock,
  Psychologist,
  UnavailableBlock,
} from "@/types/database";

/** Desktop page mode — week grid vs full appointments list. */
type PageViewMode = "calendar" | "list";

/** Mobile day presentation — agenda timeline vs hour grid. */
type MobileDayLayout = "agenda" | "grid";

interface AdminAppointmentsShellProps {
  appointments: AppointmentWithRelations[];
  psychologists: Psychologist[];
  blocks?: UnavailableBlock[];
  availability?: AvailabilityBlock[];
  workingDays: number[];
}

const viewIconClass = cn(
  "flex h-8 w-8 cursor-pointer items-center justify-center bg-transparent text-[var(--brand-text-muted)] opacity-50 transition-all duration-150 ease-out hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 md:h-9 md:w-9",
  adminControlRadius
);

const viewIconActiveClass =
  "bg-[var(--brand-purple-light)]/80 text-[var(--brand-purple)] opacity-100 hover:bg-[var(--brand-purple-light)]/80 hover:text-[var(--brand-purple)] hover:opacity-100";

function IconTooltip({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="group relative">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-[#E8E2F2] bg-white px-2.5 py-1.5 font-sans text-xs font-medium text-[var(--brand-text)] opacity-0 shadow-[0_8px_24px_rgba(93,80,122,0.12)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

function DesktopViewToggle({
  view,
  onChange,
}: {
  view: PageViewMode;
  onChange: (view: PageViewMode) => void;
}) {
  return (
    <div className="hidden items-center gap-1 md:flex">
      <IconTooltip label="Calendar View">
        <button
          type="button"
          onClick={() => onChange("calendar")}
          aria-label="Calendar View"
          aria-pressed={view === "calendar"}
          className={cn(
            viewIconClass,
            view === "calendar" && viewIconActiveClass
          )}
        >
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </IconTooltip>
      <IconTooltip label="List View">
        <button
          type="button"
          onClick={() => onChange("list")}
          aria-label="List View"
          aria-pressed={view === "list"}
          className={cn(viewIconClass, view === "list" && viewIconActiveClass)}
        >
          <LayoutList className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </IconTooltip>
    </div>
  );
}

function MobileDayLayoutToggle({
  layout,
  onChange,
}: {
  layout: MobileDayLayout;
  onChange: (layout: MobileDayLayout) => void;
}) {
  return (
    <div className="flex items-center gap-1 md:hidden">
      <IconTooltip label="Agenda">
        <button
          type="button"
          onClick={() => onChange("agenda")}
          aria-label="Agenda"
          aria-pressed={layout === "agenda"}
          className={cn(
            viewIconClass,
            layout === "agenda" && viewIconActiveClass
          )}
        >
          <LayoutList className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </IconTooltip>
      <IconTooltip label="Grid">
        <button
          type="button"
          onClick={() => onChange("grid")}
          aria-label="Grid"
          aria-pressed={layout === "grid"}
          className={cn(
            viewIconClass,
            layout === "grid" && viewIconActiveClass
          )}
        >
          <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </IconTooltip>
    </div>
  );
}

function WeekNavigation({
  label,
  onPrevious,
  onNext,
  className,
}: {
  label: string;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}) {
  const navBtnClass = cn(
    "flex h-8 w-8 cursor-pointer items-center justify-center text-[var(--brand-text-muted)] transition-all duration-150 ease-out hover:bg-[var(--brand-purple-light)]/50 hover:text-[var(--brand-purple)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-purple)]/25 md:h-9 md:w-9",
    adminControlRadius
  );

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous"
        className={navBtnClass}
      >
        <ChevronLeft className="h-5 w-5" strokeWidth={1.75} />
      </button>
      <p
        className={cn(
          type.nav,
          "min-w-[7.5rem] select-none px-1 text-center font-medium text-[var(--brand-text)] md:min-w-[8.5rem]"
        )}
      >
        {label}
      </p>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next"
        className={navBtnClass}
      >
        <ChevronRight className="h-5 w-5" strokeWidth={1.75} />
      </button>
    </div>
  );
}

function getInitialSelectedDate(workingDays: number[]): string {
  const today = getClinicToday();
  const weekStart = getWeekStartMonday(new Date());
  const visibleDays = filterWorkingDays(getWeekDays(weekStart), workingDays);
  if (visibleDays.some((day) => toClinicDateString(day) === today)) {
    return today;
  }
  return visibleDays[0]
    ? toClinicDateString(visibleDays[0])
    : today;
}

export function AdminAppointmentsShell({
  appointments,
  psychologists,
  blocks = [],
  availability = [],
  workingDays,
}: AdminAppointmentsShellProps) {
  const [view, setView] = useState<PageViewMode>("calendar");
  const [mobileDayLayout, setMobileDayLayout] =
    useState<MobileDayLayout>("agenda");
  const [selectedDateStr, setSelectedDateStr] = useState(() =>
    getInitialSelectedDate(workingDays)
  );
  const [selectedPsychologistId, setSelectedPsychologistId] = useState("");

  const sortedPsychologists = useMemo(
    () => [...psychologists].sort((a, b) => a.name.localeCompare(b.name)),
    [psychologists]
  );

  useEffect(() => {
    if (sortedPsychologists.length === 0) return;
    setSelectedPsychologistId((current) =>
      sortedPsychologists.some((psychologist) => psychologist.id === current)
        ? current
        : sortedPsychologists[0].id
    );
  }, [sortedPsychologists]);

  const weekStart = useMemo(
    () => getWeekStartMonday(parseClinicDate(selectedDateStr)),
    [selectedDateStr]
  );

  const visibleDays = useMemo(
    () => filterWorkingDays(getWeekDays(weekStart), workingDays),
    [weekStart, workingDays]
  );

  const visibleDayIndex = useMemo(
    () =>
      visibleDays.findIndex(
        (day) => toClinicDateString(day) === selectedDateStr
      ),
    [visibleDays, selectedDateStr]
  );

  const weekLabel = formatWeekRange(visibleDays);

  function selectDate(dateStr: string) {
    setSelectedDateStr(dateStr);
  }

  function goToPreviousWeek() {
    const nextWeek = shiftWeek(weekStart, -1);
    const days = filterWorkingDays(getWeekDays(nextWeek), workingDays);
    setSelectedDateStr(
      days[0] ? toClinicDateString(days[0]) : toClinicDateString(nextWeek)
    );
  }

  function goToNextWeek() {
    const nextWeek = shiftWeek(weekStart, 1);
    const days = filterWorkingDays(getWeekDays(nextWeek), workingDays);
    setSelectedDateStr(
      days[0] ? toClinicDateString(days[0]) : toClinicDateString(nextWeek)
    );
  }

  const showCalendarChrome = view === "calendar";

  return (
    <>
      <header className="mb-2 md:mb-3">
        {showCalendarChrome ? (
          <>
            {/* Mobile — title left, Agenda/Grid actions right */}
            <div className="flex items-center justify-between gap-3 md:hidden">
              <h1 className="text-xl font-bold text-[var(--brand-text)]">
                Calendar
              </h1>
              <MobileDayLayoutToggle
                layout={mobileDayLayout}
                onChange={setMobileDayLayout}
              />
            </div>

            {/* Desktop — unchanged week chrome */}
            <div className="hidden grid-cols-1 items-center gap-y-1.5 md:grid lg:grid-cols-[1fr_auto_1fr] lg:gap-x-10 lg:gap-y-0">
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-[var(--brand-text)] sm:text-2xl">
                  Calendar
                </h1>
                <DesktopViewToggle view={view} onChange={setView} />
              </div>

              <WeekNavigation
                label={weekLabel}
                onPrevious={goToPreviousWeek}
                onNext={goToNextWeek}
                className="justify-self-center"
              />

              <CalendarStatusLegend className="justify-self-end" />
            </div>

            <div className="mt-2.5 space-y-2.5 md:hidden">
              <CalendarMobileDateButton
                value={selectedDateStr}
                onChange={selectDate}
              />

              {sortedPsychologists.length > 0 && selectedPsychologistId ? (
                <CalendarMobilePsychologistSelect
                  value={selectedPsychologistId}
                  psychologists={sortedPsychologists}
                  onChange={setSelectedPsychologistId}
                />
              ) : null}

              {mobileDayLayout === "grid" ? (
                <CalendarStatusLegend variant="compact" />
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[var(--brand-text)] sm:text-2xl">
              Calendar
            </h1>
            <DesktopViewToggle view={view} onChange={setView} />
          </div>
        )}
      </header>

      {view === "calendar" ? (
        <AppointmentsCalendarView
          appointments={appointments}
          psychologists={psychologists}
          blocks={blocks}
          availability={availability}
          workingDays={workingDays}
          weekStart={weekStart}
          visibleDayIndex={visibleDayIndex}
          selectedPsychologistId={selectedPsychologistId}
          selectedDateStr={selectedDateStr}
          mobileDayLayout={mobileDayLayout}
        />
      ) : (
        <AppointmentsListView
          appointments={appointments}
          psychologists={psychologists}
        />
      )}
    </>
  );
}
