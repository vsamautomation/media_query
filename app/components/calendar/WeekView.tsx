import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragOverEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "~/lib/utils";
import EventChip from "~/components/calendar/EventChip";
import EventDragOverlay from "~/components/calendar/EventDragOverlay";
import type { CalendarEvent } from "~/components/calendar/types";

export interface WeekViewProps {
  // Data
  date: Date; // Any date within the target week
  events: CalendarEvent[];

  // Display options
  className?: string;
  weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday
  slotHeight?: number; // Height in px for each 30-min slot

  // Callbacks
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onAddClick?: (date: Date, startTime?: string) => void;
  onAssigneeClick?: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  onEventDrop?: (
    event: CalendarEvent,
    newDate: Date,
    newStartTime: string,
    newEndTime: string
  ) => void;

  // Custom rendering
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
}

const TIME_COLUMN_WIDTH = 52;
const MINUTES_PER_SLOT = 30;
const UTC_WINDOW_START_MINUTES = 7 * 60;
const UTC_WINDOW_END_MINUTES = 22 * 60;

function getLocalWindow(baseDate: Date) {
  const startUtc = new Date(
    Date.UTC(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      Math.floor(UTC_WINDOW_START_MINUTES / 60),
      UTC_WINDOW_START_MINUTES % 60,
      0,
      0
    )
  );
  const endUtc = new Date(
    Date.UTC(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate(),
      Math.floor(UTC_WINDOW_END_MINUTES / 60),
      UTC_WINDOW_END_MINUTES % 60,
      0,
      0
    )
  );
  const startMinutes = startUtc.getHours() * 60 + startUtc.getMinutes();
  const endMinutes = endUtc.getHours() * 60 + endUtc.getMinutes();
  let duration = endMinutes - startMinutes;
  if (duration <= 0) duration += 24 * 60;
  const slotCount = duration / MINUTES_PER_SLOT;
  return { startMinutes, endMinutes, duration, slotCount };
}

function getOffsetFromWindow(timeMinutes: number, windowStart: number): number {
  return (timeMinutes - windowStart + 24 * 60) % (24 * 60);
}

// Build a stable YYYY-MM-DD key for day bucketing.
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSlotId(date: Date, slotIndex: number): string {
  return `${getDateKey(date)}::${slotIndex}`;
}

function parseSlotId(id: string): { dateKey: string; slotIndex: number } | null {
  const [dateKey, slotIndexStr] = id.split("::");
  if (!dateKey || slotIndexStr === undefined) return null;
  const slotIndex = Number(slotIndexStr);
  if (!Number.isFinite(slotIndex)) return null;
  return { dateKey, slotIndex };
}

// Compare dates without time.
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Convert HH:mm to minutes since midnight.
function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes: number): string {
  const normalized = ((minutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function getEventRange(event: CalendarEvent) {
  let startMinutes = event.startTime ? parseTime(event.startTime) : 0;
  let endMinutes = event.endTime ? parseTime(event.endTime) : startMinutes + 60;
  if (!Number.isFinite(startMinutes)) startMinutes = 0;
  if (!Number.isFinite(endMinutes)) endMinutes = startMinutes + 60;
  startMinutes = Math.min(Math.max(startMinutes, 0), 24 * 60);
  endMinutes = Math.min(Math.max(endMinutes, 0), 24 * 60);
  if (endMinutes <= startMinutes) {
    endMinutes = Math.min(startMinutes + MINUTES_PER_SLOT, 24 * 60);
  }
  const duration = Math.max(endMinutes - startMinutes, MINUTES_PER_SLOT);
  return { startMinutes, endMinutes, duration };
}

// Calculate the start of the week based on the requested week start.
function startOfWeek(date: Date, weekStartsOn: 0 | 1): Date {
  const dayIndex = date.getDay();
  let diff = dayIndex - weekStartsOn;
  if (diff < 0) diff += 7;
  const start = new Date(date);
  start.setDate(date.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Return a new date offset by a number of days.
function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(date.getDate() + amount);
  return next;
}

// Build positioned events with simple lane assignment for overlaps.
function positionDayEvents(dayEvents: CalendarEvent[]) {
  const normalized = dayEvents
    .map((event) => {
      let start = event.startTime ? parseTime(event.startTime) : 0;
      let end = event.endTime ? parseTime(event.endTime) : start + 60;
      if (!Number.isFinite(start)) start = 0;
      if (!Number.isFinite(end)) end = start + 60;
      start = Math.min(Math.max(start, 0), 24 * 60);
      end = Math.min(Math.max(end, 0), 24 * 60);
      if (end <= start) {
        end = Math.min(start + MINUTES_PER_SLOT, 24 * 60);
      }
      return { event, start, end };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const result: Array<{
    event: CalendarEvent;
    start: number;
    end: number;
    laneIndex: number;
    laneCount: number;
  }> = [];
  let active: Array<{ end: number; laneIndex: number }> = [];
  let group: Array<{ event: CalendarEvent; start: number; end: number; laneIndex: number }> =
    [];
  let maxLaneIndex = 0;

  const finalizeGroup = () => {
    const laneCount = maxLaneIndex + 1;
    group.forEach((item) => result.push({ ...item, laneCount }));
    group = [];
    maxLaneIndex = 0;
  };

  normalized.forEach((item) => {
    active = active.filter((activeItem) => activeItem.end > item.start);
    if (active.length === 0 && group.length > 0) {
      finalizeGroup();
    }

    const usedLanes = new Set(active.map((activeItem) => activeItem.laneIndex));
    let laneIndex = 0;
    while (usedLanes.has(laneIndex)) laneIndex += 1;

    group.push({ ...item, laneIndex });
    active.push({ end: item.end, laneIndex });
    maxLaneIndex = Math.max(maxLaneIndex, laneIndex);
  });

  if (group.length > 0) {
    finalizeGroup();
  }

  return result;
}

function WeekSlotCell({
  id,
  isWeekend,
  isToday,
  showHourLine,
  dropEnabled,
  highlight,
  onClick,
}: {
  id: string;
  isWeekend: boolean;
  isToday: boolean;
  showHourLine: boolean;
  dropEnabled: boolean;
  highlight?: boolean;
  onClick?: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: !dropEnabled,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-r border-r-slate-200 border-t transition-colors duration-100 hover:bg-slate-100/60",
        showHourLine ? "border-t-slate-200" : "border-t-transparent",
        isWeekend && "bg-slate-50/40",
        isToday && "bg-slate-100/40",
        isOver && dropEnabled && "bg-slate-100/70",
        highlight && "bg-emerald-50/70 ring-1 ring-emerald-200"
      )}
      onClick={onClick}
    />
  );
}

// Main week view layout with 30-min slots and event positioning.
export function WeekView({
  date,
  events,
  className,
  weekStartsOn = 0,
  slotHeight = 24,
  onDayClick,
  onEventClick,
  onAddClick,
  onAssigneeClick,
  onEventDrop,
  renderEvent,
}: WeekViewProps) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dayColumnWidth, setDayColumnWidth] = useState<number | null>(null);
  const [recentDropRange, setRecentDropRange] = useState<{
    dateKey: string;
    startSlot: number;
    endSlot: number;
  } | null>(null);
  const [previewRange, setPreviewRange] = useState<{
    dateKey: string;
    startSlot: number;
    endSlot: number;
    startLabel: string;
    endLabel: string;
  } | null>(null);
  const dropResetRef = useRef<number | null>(null);
  const windowRange = useMemo(() => getLocalWindow(date), [date]);
  const weekStart = useMemo(() => startOfWeek(date, weekStartsOn), [date, weekStartsOn]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of events) {
      const key = getDateKey(event.date);
      if (!map[key]) map[key] = [];
      map[key].push(event);
    }
    return map;
  }, [events]);

  const positionedByDate = useMemo(() => {
    const map: Record<string, ReturnType<typeof positionDayEvents>> = {};
    days.forEach((day) => {
      const key = getDateKey(day);
      map[key] = positionDayEvents(eventsByDate[key] || []);
    });
    return map;
  }, [days, eventsByDate]);

  const dayNames = useMemo(
    () =>
      weekStartsOn === 0
        ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    [weekStartsOn]
  );

  const shortDayNames = useMemo(
    () =>
      weekStartsOn === 0 ? ["S", "M", "T", "W", "T", "F", "S"] : ["M", "T", "W", "T", "F", "S", "S"],
    [weekStartsOn]
  );

  const gridHeight = windowRange.slotCount * slotHeight;
  const gridTemplateColumns = `${TIME_COLUMN_WIDTH}px repeat(7, minmax(0, 1fr))`;
  const gridTemplateRows = `repeat(${windowRange.slotCount}, ${slotHeight}px)`;
  const dropEnabled = Boolean(onEventDrop);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } })
  );

  const dateKeyMap = useMemo(() => {
    const map = new Map<string, Date>();
    days.forEach((day) => map.set(getDateKey(day), day));
    return map;
  }, [days]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    const draggedEvent = events.find((item) => item.id === String(event.active.id));
    if (!draggedEvent) return;
    const range = getEventRange(draggedEvent);
    const startOffset = getOffsetFromWindow(range.startMinutes, windowRange.startMinutes);
    const rawStartSlot = Math.floor(startOffset / MINUTES_PER_SLOT);
    const rawEndSlot = Math.max(
      Math.ceil((startOffset + range.duration) / MINUTES_PER_SLOT),
      rawStartSlot + 1
    );
    const startSlot = Math.min(rawStartSlot, windowRange.slotCount - 1);
    const endSlot = Math.min(rawEndSlot, windowRange.slotCount);
    setPreviewRange({
      dateKey: getDateKey(draggedEvent.date),
      startSlot,
      endSlot,
      startLabel: formatTime(range.startMinutes),
      endLabel: formatTime(range.endMinutes),
    });
  };

  const handleDragCancel = () => {
    setActiveDragId(null);
    setPreviewRange(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) {
      setPreviewRange(null);
      return;
    }
    const parsed = parseSlotId(String(event.over.id));
    if (!parsed) {
      setPreviewRange(null);
      return;
    }
    const draggedEvent = events.find((item) => item.id === String(event.active.id));
    if (!draggedEvent) {
      setPreviewRange(null);
      return;
    }
    const range = getEventRange(draggedEvent);
    const startMinutes =
      windowRange.startMinutes + parsed.slotIndex * MINUTES_PER_SLOT;
    const endMinutes = startMinutes + range.duration;
    const rawStartSlot = parsed.slotIndex;
    const rawEndSlot = Math.max(
      Math.ceil((rawStartSlot * MINUTES_PER_SLOT + range.duration) / MINUTES_PER_SLOT),
      rawStartSlot + 1
    );
    const startSlot = Math.min(rawStartSlot, windowRange.slotCount - 1);
    const endSlot = Math.min(rawEndSlot, windowRange.slotCount);

    setPreviewRange({
      dateKey: parsed.dateKey,
      startSlot,
      endSlot,
      startLabel: formatTime(startMinutes),
      endLabel: formatTime(endMinutes),
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (!onEventDrop) return;
    const { active, over } = event;
    if (!over) {
      setActiveDragId(null);
      setPreviewRange(null);
      return;
    }
    const parsed = parseSlotId(String(over.id));
    if (!parsed) {
      setActiveDragId(null);
      setPreviewRange(null);
      return;
    }
    const targetDate = dateKeyMap.get(parsed.dateKey);
    if (!targetDate) {
      setActiveDragId(null);
      setPreviewRange(null);
      return;
    }
    const draggedEvent = events.find((item) => item.id === String(active.id));
    if (!draggedEvent) {
      setActiveDragId(null);
      setPreviewRange(null);
      return;
    }

    const startMinutes =
      windowRange.startMinutes + parsed.slotIndex * MINUTES_PER_SLOT;
    const range = getEventRange(draggedEvent);
    const duration = range.duration;
    let endMinutes = startMinutes + duration;
    if (endMinutes <= startMinutes) {
      endMinutes = startMinutes + MINUTES_PER_SLOT;
    }

    const newStartTime = formatTime(startMinutes);
    const newEndTime = formatTime(endMinutes);

    const sameDay = isSameDay(draggedEvent.date, targetDate);
    if (
      sameDay &&
      draggedEvent.startTime === newStartTime &&
      draggedEvent.endTime === newEndTime
    ) {
      setActiveDragId(null);
      return;
    }

    onEventDrop(draggedEvent, targetDate, newStartTime, newEndTime);
    const rawStartSlot = parsed.slotIndex;
    const rawEndSlot = Math.max(
      Math.ceil((rawStartSlot * MINUTES_PER_SLOT + duration) / MINUTES_PER_SLOT),
      rawStartSlot + 1
    );
    const startSlot = Math.min(rawStartSlot, windowRange.slotCount - 1);
    const endSlot = Math.min(rawEndSlot, windowRange.slotCount);
    setRecentDropRange({
      dateKey: getDateKey(targetDate),
      startSlot,
      endSlot,
    });
    if (dropResetRef.current) window.clearTimeout(dropResetRef.current);
    dropResetRef.current = window.setTimeout(() => {
      setRecentDropRange(null);
    }, 500);
    setActiveDragId(null);
    setPreviewRange(null);
  };

  const activeEvent = activeDragId
    ? events.find((item) => item.id === activeDragId) || null
    : null;
  const isDragging = Boolean(activeDragId);
  const showAssigneeMinWidth = 22;

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const width = element.clientWidth;
      const dayWidth = (width - TIME_COLUMN_WIDTH) / 7;
      if (Number.isFinite(dayWidth)) {
        setDayColumnWidth(dayWidth);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (dropResetRef.current) window.clearTimeout(dropResetRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        "w-full border border-slate-200 bg-white",
        activeDragId && "touch-none",
        className
      )}
    >
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className="grid border-b border-slate-200 bg-white"
          style={{ gridTemplateColumns }}
        >
          <div className="flex items-center justify-center border-r border-slate-200 text-[9px] font-semibold text-slate-400 sm:text-[10px] lg:text-[11px]">
            Time
          </div>
          {days.map((day, index) => {
            const isWeekend = day.getDay() === 0 || day.getDay() === 6;
            const isToday = isSameDay(day, new Date());
            const dateLabel = new Intl.DateTimeFormat("en-GB", {
              day: "numeric",
              month: "short",
            }).format(day);

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "group relative flex min-h-[44px] flex-col justify-center gap-0.5 border-r border-slate-200 px-1.5 py-2 sm:px-2",
                  isWeekend && "bg-slate-50/60",
                  isToday && "bg-slate-100/80"
                )}
                onClick={() => onDayClick?.(day)}
              >
                <div className="text-[10px] font-semibold text-slate-600 sm:text-[11px] lg:text-[12px]">
                  <span className="hidden sm:inline">{dayNames[index]}</span>
                  <span className="sm:hidden">{shortDayNames[index]}</span>
                </div>
                <div className="text-[9px] text-slate-500 sm:text-[10px] lg:text-[11px]">
                  {dateLabel}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative">
          <div
            className="grid text-[9px] text-slate-500 lg:text-[11px]"
            style={{ gridTemplateColumns, gridTemplateRows, height: gridHeight }}
          >
          {Array.from({ length: windowRange.slotCount }, (_, slotIndex) => {
            const isHourStart = slotIndex % 2 === 0;
            const label = isHourStart
              ? formatTime(windowRange.startMinutes + slotIndex * MINUTES_PER_SLOT)
              : "";
            const showHourLine = isHourStart && slotIndex !== 0;
            const timeCellClass = isHourStart
              ? "relative flex items-center justify-end border-r border-slate-200 pr-1 text-[9px] font-medium text-slate-500 lg:text-[11px]"
              : "border-r border-slate-200";
            const isFirstHourLabel = isHourStart && slotIndex === 0;
            return (
                <Fragment key={`row-${slotIndex}`}>
                  <div className={cn(timeCellClass)}>
                    {label && (
                      <span
                        className={cn(
                          "absolute right-1 top-0",
                          isFirstHourLabel ? "translate-y-0" : "-translate-y-1/2"
                        )}
                      >
                        {label}
                      </span>
                    )}
                  </div>
                  {days.map((day) => {
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    const isToday = isSameDay(day, new Date());
                    const slotTime = formatTime(
                      windowRange.startMinutes + slotIndex * MINUTES_PER_SLOT
                    );
                    const slotKey = getSlotId(day, slotIndex);
                    const highlight =
                      Boolean(recentDropRange) &&
                      recentDropRange?.dateKey === getDateKey(day) &&
                      slotIndex >= recentDropRange.startSlot &&
                      slotIndex < recentDropRange.endSlot;
                    return (
                      <WeekSlotCell
                        key={`${day.toISOString()}-${slotIndex}`}
                        id={slotKey}
                        isWeekend={isWeekend}
                        isToday={isToday}
                        showHourLine={showHourLine}
                        dropEnabled={dropEnabled}
                        highlight={highlight}
                        onClick={() => {
                          if (isDragging) return;
                          onAddClick?.(day, slotTime);
                        }}
                      />
                    );
                  })}
                </Fragment>
              );
            })}
          </div>

          <div
            className="pointer-events-none absolute left-0 top-0 h-full w-full"
            style={{ height: gridHeight }}
          >
            <div className="absolute left-0 top-0 h-full w-full">
              <div
                className="grid h-full"
                style={{ gridTemplateColumns }}
                aria-hidden="true"
              >
                <div />
                {days.map((day) => {
                  const dayKey = getDateKey(day);
                  const positioned = positionedByDate[dayKey] || [];
                  return (
                    <div key={dayKey} className="relative h-full">
                      {previewRange && previewRange.dateKey === dayKey && (
                        <div
                          className="absolute left-0 right-0 px-0.5"
                          style={{
                            top: previewRange.startSlot * slotHeight,
                            height:
                              (previewRange.endSlot - previewRange.startSlot) *
                              slotHeight,
                          }}
                        >
                          <div className="relative h-full rounded-sm border border-slate-300 bg-slate-200/40">
                            <span className="absolute left-1 top-0 -translate-y-full -mt-1 rounded bg-white px-1 text-[8px] font-medium text-slate-600 shadow-sm lg:text-[10px]">
                              {previewRange.startLabel}
                            </span>
                            <span className="absolute left-1 bottom-0 translate-y-full mt-1 rounded bg-white px-1 text-[8px] font-medium text-slate-600 shadow-sm lg:text-[10px]">
                              {previewRange.endLabel}
                            </span>
                          </div>
                        </div>
                      )}
                      {positioned.map((item) => {
                        const startOffset = getOffsetFromWindow(
                          item.start,
                          windowRange.startMinutes
                        );
                        if (startOffset >= windowRange.duration) return null;
                        const endOffset = Math.min(
                          startOffset + (item.end - item.start),
                          windowRange.duration
                        );
                        const duration = Math.max(
                          endOffset - startOffset,
                          MINUTES_PER_SLOT
                        );
                        const top = (startOffset / MINUTES_PER_SLOT) * slotHeight;
                        const height = (duration / MINUTES_PER_SLOT) * slotHeight;
                        const width = 100 / item.laneCount;
                        const left = item.laneIndex * width;
                        const slotWidth = dayColumnWidth
                          ? dayColumnWidth / item.laneCount
                          : null;
                        const showAssignee =
                          slotWidth === null || slotWidth >= showAssigneeMinWidth;
                        return (
                          <div
                            key={item.event.id}
                            className="pointer-events-auto absolute px-0.5"
                            style={{
                              top,
                              height,
                              left: `${left}%`,
                              width: `${width}%`,
                            }}
                          >
                            {renderEvent ? (
                              <div className="h-full">{renderEvent(item.event)}</div>
                            ) : (
                              <EventChip
                                event={item.event}
                                onClick={onEventClick}
                                onAssigneeClick={onAssigneeClick}
                                showAssignee={showAssignee}
                                variant="week"
                                className="h-full"
                                dragEnabled={dropEnabled}
                                useDragOverlay={true}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <DragOverlay>{activeEvent ? <EventDragOverlay event={activeEvent} /> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}
