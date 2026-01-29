import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "~/lib/utils";
import EventChip from "~/components/calendar/EventChip";
import EventDragOverlay from "~/components/calendar/EventDragOverlay";
import type { CalendarEvent } from "~/components/calendar/types";

export type { CalendarEvent } from "~/components/calendar/types";

export interface MonthViewProps {
  // Data
  year: number;
  month: number; // 0-indexed (0 = January)
  events: CalendarEvent[];

  // Display options
  className?: string;
  maxEventsPerDay?: number;
  showWeekNumbers?: boolean;
  weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday

  // Callbacks
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMoreClick?: (date: Date, events: CalendarEvent[]) => void;
  onAddClick?: (date: Date, startTime?: string) => void;
  onAssigneeClick?: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  onEventDrop?: (event: CalendarEvent, newDate: Date) => void;
  onNavigate?: (year: number, month: number) => void;

  // Custom rendering
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
  renderDayHeader?: (date: Date) => React.ReactNode;
}

// Build a stable YYYY-MM-DD key for day bucketing.
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Week number used when week numbers are shown.
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// Create the month grid including leading/trailing days to fill weeks.
function getDaysInMonth(
  year: number,
  month: number,
  weekStartsOn: 0 | 1 = 0
): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  let firstDayOfWeek = firstDay.getDay();
  if (weekStartsOn === 1) {
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  }

  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

// Compare dates without time.
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Shortcut for "today" highlighting.
function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

// Sorting helpers
// Convert HH:mm to minutes since midnight.
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// Sort events within a day by start time.
function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
}

// Single day cell in the month grid (droppable target)
function DayCell({
  date,
  isCurrentMonth,
  events,
  onDayClick,
  onEventClick,
  renderEvent,
  onAddClick,
  onAssigneeClick,
  dragEnabled,
  dropEnabled,
  recentlyDropped,
  visibleLimit,
  isTriggerExpanded,
  onToggleExpand,
}: {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
  onAddClick?: (date: Date) => void;
  onAssigneeClick?: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  dragEnabled: boolean;
  dropEnabled: boolean;
  recentlyDropped?: boolean;
  visibleLimit: number;
  isTriggerExpanded: boolean;
  onToggleExpand?: (date: Date, events: CalendarEvent[]) => void;
}) {
  const dateKey = getDateKey(date);
  const { setNodeRef, isOver } = useDroppable({
    id: dateKey,
    disabled: !dropEnabled,
  });
  const sortedEvents = events;
  const today = isToday(date);
  const hiddenCount = Math.max(0, sortedEvents.length - visibleLimit);
  const showToggle = hiddenCount > 0 || isTriggerExpanded;
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group flex h-full flex-col px-1 py-0.5 text-slate-900 transition-colors duration-150 sm:px-1.5 sm:py-1",
        isWeekend && "bg-slate-50/60",
        !isCurrentMonth && "bg-slate-50 text-slate-400",
        onDayClick && "cursor-pointer hover:bg-slate-50",
        isOver && dropEnabled && "bg-slate-100/70 ring-2 ring-slate-300 ring-inset",
        recentlyDropped && "bg-emerald-50/50 ring-2 ring-emerald-300/70 ring-inset animate-pulse"
      )}
      onClick={() => onDayClick?.(date)}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {sortedEvents.map((event, index) => {
          const isVisible = index < visibleLimit;
          const isLastVisible =
            isVisible &&
            (index === visibleLimit - 1 || index === sortedEvents.length - 1);
          return (
            <div
              key={event.id}
              className={cn(
                "overflow-hidden transition-[max-height,opacity,margin] duration-200 ease-out",
                isVisible
                  ? "max-h-24 opacity-100"
                  : "max-h-0 opacity-0 pointer-events-none",
                isVisible && !isLastVisible ? "mb-1" : "mb-0"
              )}
            >
              {renderEvent ? (
                <div onClick={(e) => e.stopPropagation()}>{renderEvent(event)}</div>
              ) : (
                <EventChip
                  event={event}
                  onClick={onEventClick}
                  onAssigneeClick={onAssigneeClick}
                  dragEnabled={dragEnabled}
                />
              )}
            </div>
          );
        })}
        {showToggle && (
          <button
            type="button"
            className="text-left text-[9px] font-medium text-slate-500 hover:text-slate-800 sm:text-[11px] lg:text-[12px]"
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpand?.(date, sortedEvents);
            }}
          >
            {isTriggerExpanded ? "Show less" : `+${hiddenCount}`}
          </button>
        )}
      </div>
      <div className="mt-0.5 flex items-center justify-between sm:mt-1">
        <button
          type="button"
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-sm text-[11px] text-slate-400 transition hover:bg-slate-200 hover:text-slate-800 sm:h-5 sm:w-5 sm:text-[12px] lg:h-6 lg:w-6 lg:text-[13px]",
            "opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100"
          )}
          onClick={(event) => {
            event.stopPropagation();
            onAddClick?.(date);
          }}
          aria-label={`Add event on ${date.toDateString()}`}
        >
          +
        </button>
        <span
          className={cn(
            "text-[10px] font-medium sm:text-[12px] lg:text-[13px]",
            today && "rounded-full bg-slate-900 px-1 py-0.5 text-white sm:px-1.5",
            !today && isCurrentMonth && "text-slate-700",
            !today && !isCurrentMonth && "text-slate-400"
          )}
        >
          {date.getDate()}
        </span>
      </div>
    </div>
  );
}

// A week row containing 7 day cells (plus optional week number)
function WeekRow({
  days,
  currentMonth,
  eventsByDate,
  maxEventsPerDay,
  showWeekNumbers,
  onDayClick,
  onEventClick,
  renderEvent,
  onAddClick,
  onAssigneeClick,
  dragEnabled,
  dropEnabled,
  recentlyDroppedDateKey,
  expandedWeekIndex,
  expandedThreshold,
  expandedTriggerDateKey,
  onToggleExpand,
  weekIndex,
  gridClassName,
  rowClassName,
}: {
  days: Date[];
  currentMonth: number;
  eventsByDate: Record<string, CalendarEvent[]>;
  maxEventsPerDay: number;
  showWeekNumbers: boolean;
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
  onAddClick?: (date: Date) => void;
  onAssigneeClick?: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  dragEnabled: boolean;
  dropEnabled: boolean;
  recentlyDroppedDateKey?: string | null;
  expandedWeekIndex: number | null;
  expandedThreshold: number | null;
  expandedTriggerDateKey: string | null;
  onToggleExpand?: (weekIndex: number, date: Date, events: CalendarEvent[]) => void;
  weekIndex: number;
  gridClassName: string;
  rowClassName?: string;
}) {
  const weekNumber = getWeekNumber(days[0]);
  const weekVisibleLimit =
    expandedWeekIndex === weekIndex && expandedThreshold
      ? expandedThreshold
      : maxEventsPerDay;

  return (
    <div className={cn("grid divide-x divide-slate-200", gridClassName, rowClassName)}>
      {showWeekNumbers && (
        <div className="flex items-end justify-center pb-0.5 text-[9px] font-medium text-slate-400 sm:pb-1 sm:text-[11px] lg:text-[12px]">
          {String(weekNumber).padStart(2, "0")}
        </div>
      )}
      {days.map((date) => {
        const dateKey = getDateKey(date);
        const dayEvents = eventsByDate[dateKey] ?? [];
        return (
          <DayCell
            key={dateKey}
            date={date}
            isCurrentMonth={date.getMonth() === currentMonth}
            events={dayEvents}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
            renderEvent={renderEvent}
            onAddClick={onAddClick}
            onAssigneeClick={onAssigneeClick}
            dragEnabled={dragEnabled}
            dropEnabled={dropEnabled}
            recentlyDropped={recentlyDroppedDateKey === dateKey}
            visibleLimit={weekVisibleLimit}
            isTriggerExpanded={expandedTriggerDateKey === dateKey}
            onToggleExpand={(date, eventsList) =>
              onToggleExpand?.(weekIndex, date, eventsList)
            }
          />
        );
      })}
    </div>
  );
}

// Main MonthView grid with dnd-kit context
export function MonthView({
  year,
  month,
  events,
  className,
  maxEventsPerDay = 3,
  showWeekNumbers = false,
  weekStartsOn = 0,
  onDayClick,
  onEventClick,
  onMoreClick,
  onAddClick,
  onAssigneeClick,
  onEventDrop,
  renderEvent,
}: MonthViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [recentDropDateKey, setRecentDropDateKey] = useState<string | null>(null);
  const [expandedWeekIndex, setExpandedWeekIndex] = useState<number | null>(null);
  const [expandedThreshold, setExpandedThreshold] = useState<number | null>(null);
  const [expandedTriggerDateKey, setExpandedTriggerDateKey] = useState<string | null>(null);
  const dropResetRef = useRef<number | null>(null);

  const days = useMemo(
    () => getDaysInMonth(year, month, weekStartsOn),
    [year, month, weekStartsOn]
  );

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const key = getDateKey(event.date);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    Object.keys(map).forEach((key) => {
      map[key] = sortEventsByTime(map[key]);
    });
    return map;
  }, [events]);

  const dayNames = useMemo(() => {
    return weekStartsOn === 0
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  }, [weekStartsOn]);

  const shortDayNames = useMemo(() => {
    return weekStartsOn === 0
      ? ["S", "M", "T", "W", "T", "F", "S"]
      : ["M", "T", "W", "T", "F", "S", "S"];
  }, [weekStartsOn]);

  const gridClassName = showWeekNumbers
    ? "grid-cols-[20px_repeat(7,minmax(0,1fr))] sm:grid-cols-[28px_repeat(7,minmax(0,1fr))] lg:grid-cols-[36px_repeat(7,minmax(0,1fr))]"
    : "grid-cols-[repeat(7,minmax(0,1fr))]";

  const dndEnabled = Boolean(onEventDrop);
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 4 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    })
  );
  const dateKeyMap = useMemo(() => {
    const map = new Map<string, Date>();
    days.forEach((day) => map.set(getDateKey(day), day));
    return map;
  }, [days]);

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onEventDrop) return;
    const { active, over } = event;
    if (!over) return;
    const targetDate = dateKeyMap.get(String(over.id));
    if (!targetDate) return;
    const draggedEvent = events.find((item) => item.id === String(active.id));
    if (!draggedEvent) return;
    if (isSameDay(draggedEvent.date, targetDate)) return;
    onEventDrop(draggedEvent, targetDate);
    const targetKey = getDateKey(targetDate);
    setRecentDropDateKey(targetKey);
    if (dropResetRef.current) {
      window.clearTimeout(dropResetRef.current);
    }
    dropResetRef.current = window.setTimeout(() => {
      setRecentDropDateKey(null);
    }, 650);
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
  };

  const handleToggleExpand = (
    weekIndex: number,
    date: Date,
    dayEvents: CalendarEvent[]
  ) => {
    const key = getDateKey(date);
    const isSameTrigger =
      expandedWeekIndex === weekIndex && expandedTriggerDateKey === key;

    if (isSameTrigger) {
      setExpandedWeekIndex(null);
      setExpandedThreshold(null);
      setExpandedTriggerDateKey(null);
    } else {
      setExpandedWeekIndex(weekIndex);
      setExpandedThreshold(dayEvents.length);
      setExpandedTriggerDateKey(key);
    }

    onMoreClick?.(date, dayEvents);
  };

  useEffect(() => {
    return () => {
      if (dropResetRef.current) {
        window.clearTimeout(dropResetRef.current);
      }
    };
  }, []);

  const activeEvent = activeDragId
    ? events.find((item) => item.id === activeDragId) || null
    : null;

  return (
    <div className={cn("relative w-full max-w-full overflow-x-hidden", className)}>
      <div className="w-full min-w-0 border border-slate-200 bg-white">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={(event) => {
            handleDragEnd(event);
            setActiveDragId(null);
          }}
          onDragCancel={handleDragCancel}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div
              className={cn(
                "grid divide-x divide-slate-200 border-b border-slate-200 bg-white",
                gridClassName
              )}
            >
              {showWeekNumbers && (
                <div className="flex items-center justify-center text-[9px] font-semibold text-slate-400 sm:text-[11px] lg:text-[12px]">
                  WN
                </div>
              )}
              {dayNames.map((day, index) => (
                <div key={day} className="px-1 py-1 sm:px-2 sm:py-2">
                  <span className="hidden text-[10px] font-semibold text-slate-600 sm:inline sm:text-[12px] lg:text-[13px]">
                    {day}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-600 sm:hidden lg:text-[12px]">
                    {shortDayNames[index]}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col">
              {weeks.map((weekDays, index) => (
                <WeekRow
                  key={index}
                  weekIndex={index}
                  days={weekDays}
                  currentMonth={month}
                  eventsByDate={eventsByDate}
                  maxEventsPerDay={maxEventsPerDay}
                  showWeekNumbers={showWeekNumbers}
                  onDayClick={onDayClick}
                  onEventClick={onEventClick}
                  onAddClick={onAddClick}
                  onAssigneeClick={onAssigneeClick}
                  dragEnabled={dndEnabled}
                  dropEnabled={dndEnabled}
                  recentlyDroppedDateKey={recentDropDateKey}
                  expandedWeekIndex={expandedWeekIndex}
                  expandedThreshold={expandedThreshold}
                  expandedTriggerDateKey={expandedTriggerDateKey}
                  onToggleExpand={(weekIdx, date, dayEvents) =>
                    handleToggleExpand(weekIdx, date, dayEvents)
                  }
                  renderEvent={renderEvent}
                  gridClassName={gridClassName}
                  rowClassName={cn(
                    "border-b border-slate-200",
                    index === weeks.length - 1 && "border-b-0",
                    "flex-1 min-h-[56px] sm:min-h-[72px] lg:min-h-[84px]"
                  )}
                />
              ))}
            </div>
          </div>
          <DragOverlay>
            {activeEvent ? <EventDragOverlay event={activeEvent} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}

export default MonthView;
