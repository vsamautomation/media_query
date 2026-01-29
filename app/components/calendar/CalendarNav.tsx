import { ChevronLeft, ChevronRight, Filter, Plus, Search, Users } from "lucide-react";
import StatusFilterDropdown, {
  type StatusFilterValue,
} from "~/components/calendar/StatusFilterDropdown";
import ViewModeDropdown from "~/components/calendar/ViewModeDropdown";
import type { CalendarViewMode } from "~/components/calendar/viewTypes";
import { Button } from "~/components/ui/button";
import { SidebarTrigger } from "~/components/ui/sidebar";

interface CalendarNavProps {
  viewMode: CalendarViewMode;
  currentDate: Date;
  weekStartsOn?: 0 | 1;
  onViewModeChange: (mode: CalendarViewMode) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onAddTask?: () => void;
  statusFilter: StatusFilterValue;
  onStatusFilterChange: (value: StatusFilterValue) => void;
}

function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const dayIndex = date.getDay();
  let diff = dayIndex - weekStartsOn;
  if (diff < 0) diff += 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

function formatMonth(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function formatMonthShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function formatMonthDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function formatMonthDayShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatWeekdayShort(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getRangeLabel(
  date: Date,
  viewMode: CalendarViewMode,
  weekStartsOn: 0 | 1
): string {
  if (viewMode === "month") {
    return formatMonth(date);
  }
  if (viewMode === "day") {
    return formatWeekday(date);
  }
  if (viewMode === "table") {
    const start = startOfWeek(date, weekStartsOn);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${formatMonth(start).split(" ")[0]} ${start.getDate()} - ${end.getDate()}`;
    }
    return `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
  }
  const start = startOfWeek(date, weekStartsOn);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${formatMonth(start).split(" ")[0]} ${start.getDate()} - ${end.getDate()}`;
  }
  return `${formatMonthDay(start)} - ${formatMonthDay(end)}`;
}

function getRangeLabelShort(
  date: Date,
  viewMode: CalendarViewMode,
  weekStartsOn: 0 | 1
): string {
  if (viewMode === "month") {
    return formatMonthShort(date);
  }
  if (viewMode === "day") {
    return formatWeekdayShort(date);
  }
  if (viewMode === "table") {
    const start = startOfWeek(date, weekStartsOn);
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth();
    if (sameMonth) {
      return `${formatMonthShort(start).split(" ")[0]} ${start.getDate()}-${end.getDate()}`;
    }
    return `${formatMonthDayShort(start)} - ${formatMonthDayShort(end)}`;
  }
  const start = startOfWeek(date, weekStartsOn);
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${formatMonthShort(start).split(" ")[0]} ${start.getDate()}-${end.getDate()}`;
  }
  return `${formatMonthDayShort(start)} - ${formatMonthDayShort(end)}`;
}

export default function CalendarNav({
  viewMode,
  currentDate,
  weekStartsOn = 0,
  onViewModeChange,
  onToday,
  onPrev,
  onNext,
  onAddTask,
  statusFilter,
  onStatusFilterChange,
}: CalendarNavProps) {
  const rangeLabel = getRangeLabel(currentDate, viewMode, weekStartsOn);
  const rangeLabelShort = getRangeLabelShort(currentDate, viewMode, weekStartsOn);

  const actionButton =
    "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-100";
  const iconOnlyButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100";
  const iconButton =
    "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100";

  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="flex items-center gap-2 overflow-x-auto px-3 py-2 whitespace-nowrap">
        <div className="flex min-w-0 items-center gap-2">
          <SidebarTrigger className="text-slate-600 hover:bg-slate-100" />
          <button
            type="button"
            className="inline-flex h-7 items-center rounded-md border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={onToday}
          >
            Today
          </button>
          <ViewModeDropdown value={viewMode} onChange={onViewModeChange} />
          <div className="flex items-center gap-1">
            <button type="button" className={iconButton} onClick={onPrev} aria-label="Previous">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" className={iconButton} onClick={onNext} aria-label="Next">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="hidden max-w-[180px] truncate text-[12px] font-semibold text-slate-700 md:inline">
            {rangeLabel}
          </span>
          <span className="max-w-[120px] truncate text-[12px] font-semibold text-slate-700 md:hidden">
            {rangeLabelShort}
          </span>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center gap-1.5 md:flex">
            <button type="button" className={actionButton}>
              <Filter className="h-3.5 w-3.5" />
              Filter
            </button>
            <StatusFilterDropdown
              value={statusFilter}
              onChange={onStatusFilterChange}
            />
            <button type="button" className={actionButton}>
              <Users className="h-3.5 w-3.5" />
              Assignee
            </button>
          </div>
          <div className="flex items-center gap-1.5 md:hidden">
            <button type="button" className={iconOnlyButton} aria-label="Filter">
              <Filter className="h-3.5 w-3.5" />
            </button>
            <StatusFilterDropdown
              value={statusFilter}
              onChange={onStatusFilterChange}
            />
            <button type="button" className={iconOnlyButton} aria-label="Assignee">
              <Users className="h-3.5 w-3.5" />
            </button>
          </div>
          <button type="button" className={iconButton} aria-label="Search">
            <Search className="h-3.5 w-3.5" />
          </button>
          <Button
            type="button"
            size="sm"
            className="h-7 gap-1 bg-[#2a436c] px-2 text-[11px] font-semibold hover:bg-[#22395d]"
            onClick={onAddTask}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Add Job</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
