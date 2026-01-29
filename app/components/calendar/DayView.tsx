import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  pointerWithin,
  type DragOverEvent,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { cn } from "~/lib/utils";
import EventChip from "~/components/calendar/EventChip";
import EventDragOverlay from "~/components/calendar/EventDragOverlay";
import type { CalendarEvent } from "~/components/calendar/types";

export interface DayViewCleaner {
  id: string;
  firstName: string;
  lastName: string;
  initials: string;
  profilePicUrl?: string | null;
}

export interface DayViewProps {
  // Data
  date: Date;
  events: CalendarEvent[];
  cleaners: DayViewCleaner[];

  // Display options
  className?: string;
  slotHeight?: number;
  showUnassigned?: boolean;

  // Callbacks
  onEventClick?: (event: CalendarEvent) => void;
  onAddClick?: (date: Date, startTime?: string, cleanerId?: string | null) => void;
  onEventDrop?: (
    event: CalendarEvent,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    newAssigneeId: string | null
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

function getSlotId(cleanerId: string, slotIndex: number): string {
  return `${cleanerId}::${slotIndex}`;
}

function parseSlotId(id: string): { cleanerId: string; slotIndex: number } | null {
  const [cleanerId, slotIndexStr] = id.split("::");
  if (!cleanerId || slotIndexStr === undefined) return null;
  const slotIndex = Number(slotIndexStr);
  if (!Number.isFinite(slotIndex)) return null;
  return { cleanerId, slotIndex };
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

function DaySlotCell({
  id,
  showHourLine,
  onClick,
  dropEnabled,
}: {
  id: string;
  showHourLine: boolean;
  dropEnabled: boolean;
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
        isOver && dropEnabled && "bg-slate-100/70"
      )}
      onClick={onClick}
    />
  );
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

export function DayView({
  date,
  events,
  cleaners,
  className,
  slotHeight = 24,
  showUnassigned = true,
  onEventClick,
  onAddClick,
  onEventDrop,
  renderEvent,
}: DayViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [columnWidth, setColumnWidth] = useState<number | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [previewRange, setPreviewRange] = useState<{
    cleanerId: string;
    startSlot: number;
    endSlot: number;
    startLabel: string;
    endLabel: string;
  } | null>(null);
  const windowRange = useMemo(() => getLocalWindow(date), [date]);
  const dayEvents = useMemo(
    () => events.filter((event) => isSameDay(event.date, date)),
    [events, date]
  );

  const cleanerColumns = useMemo(() => {
    const columns = cleaners.map((cleaner) => ({
      id: cleaner.id,
      name: `${cleaner.firstName} ${cleaner.lastName}`,
      firstName: cleaner.firstName,
      initials: cleaner.initials,
      avatarUrl: cleaner.profilePicUrl || null,
      isUnassigned: false,
    }));

    if (showUnassigned) {
      const hasUnassigned = dayEvents.some(
        (event) => !event.assigneeId || !cleaners.find((c) => c.id === event.assigneeId)
      );
      if (hasUnassigned) {
        columns.unshift({
          id: "unassigned",
          name: "Unassigned",
          firstName: "Unassigned",
          initials: "UA",
          avatarUrl: null,
          isUnassigned: true,
        });
      }
    }

    return columns;
  }, [cleaners, dayEvents, showUnassigned]);

  const eventsByCleaner = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    cleanerColumns.forEach((cleaner) => {
      map[cleaner.id] = [];
    });
    dayEvents.forEach((event) => {
      const cleanerId = event.assigneeId || "unassigned";
      if (!map[cleanerId]) {
        map[cleanerId] = [];
      }
      map[cleanerId].push(event);
    });
    return map;
  }, [dayEvents, cleanerColumns]);

  const positionedByCleaner = useMemo(() => {
    const map: Record<string, ReturnType<typeof positionDayEvents>> = {};
    cleanerColumns.forEach((cleaner) => {
      map[cleaner.id] = positionDayEvents(eventsByCleaner[cleaner.id] || []);
    });
    return map;
  }, [cleanerColumns, eventsByCleaner]);

  const gridHeight = windowRange.slotCount * slotHeight;
  const gridTemplateColumns = `${TIME_COLUMN_WIDTH}px repeat(${cleanerColumns.length}, minmax(0, 1fr))`;
  const gridTemplateRows = `repeat(${windowRange.slotCount}, ${slotHeight}px)`;
  const showName = columnWidth === null || columnWidth >= 40;
  const dropEnabled = Boolean(onEventDrop);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } })
  );
  const isDragging = Boolean(activeDragId);

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const updateWidth = () => {
      const width = element.clientWidth;
      const available = width - TIME_COLUMN_WIDTH;
      const next = available / Math.max(cleanerColumns.length, 1);
      if (Number.isFinite(next)) setColumnWidth(next);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [cleanerColumns.length]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
    const draggedEvent = events.find((item) => item.id === String(event.active.id));
    if (!draggedEvent) return;
    const currentCleanerId = draggedEvent.assigneeId || "unassigned";
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
      cleanerId: currentCleanerId,
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
    const targetStartMinutes =
      windowRange.startMinutes + parsed.slotIndex * MINUTES_PER_SLOT;
    const isAssigned = Boolean(draggedEvent.assigneeId);
    const startMinutes = isAssigned ? targetStartMinutes : range.startMinutes;
    const endMinutes = isAssigned
      ? targetStartMinutes + range.duration
      : range.endMinutes;
    const startOffset = isAssigned
      ? parsed.slotIndex * MINUTES_PER_SLOT
      : getOffsetFromWindow(range.startMinutes, windowRange.startMinutes);
    const rawStartSlot = Math.floor(startOffset / MINUTES_PER_SLOT);
    const rawEndSlot = Math.max(
      Math.ceil((startOffset + range.duration) / MINUTES_PER_SLOT),
      rawStartSlot + 1
    );
    const startSlot = Math.min(rawStartSlot, windowRange.slotCount - 1);
    const endSlot = Math.min(rawEndSlot, windowRange.slotCount);

    setPreviewRange({
      cleanerId: parsed.cleanerId,
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

    const newAssigneeId = parsed.cleanerId === "unassigned" ? null : parsed.cleanerId;
    const wasAssigned = Boolean(draggedEvent.assigneeId);
    const newStartTime = !wasAssigned ? draggedEvent.startTime : formatTime(startMinutes);
    const newEndTime = !wasAssigned ? draggedEvent.endTime : formatTime(endMinutes);
    const sameAssignee = (draggedEvent.assigneeId || null) === newAssigneeId;
    if (
      sameAssignee &&
      draggedEvent.startTime === newStartTime &&
      draggedEvent.endTime === newEndTime
    ) {
      setActiveDragId(null);
      return;
    }

    onEventDrop(draggedEvent, new Date(date), newStartTime, newEndTime, newAssigneeId);
    setActiveDragId(null);
    setPreviewRange(null);
  };

  const activeEvent = activeDragId
    ? events.find((item) => item.id === activeDragId) || null
    : null;

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
        collisionDetection={pointerWithin}
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
          {cleanerColumns.map((cleaner) => (
            <div
              key={cleaner.id}
              className="flex min-h-[44px] flex-col items-center justify-center gap-1 border-r border-slate-200 px-1 py-1 text-center"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[9px] font-semibold text-slate-700 lg:h-7 lg:w-7 lg:text-[11px]">
                {cleaner.avatarUrl ? (
                  <img
                    src={cleaner.avatarUrl}
                    alt={cleaner.name}
                    className="h-6 w-6 rounded-full object-cover lg:h-7 lg:w-7"
                  />
                ) : (
                  cleaner.initials
                )}
              </div>
              {showName && (
                <div className="max-w-full truncate text-[8px] font-medium text-slate-700 lg:text-[10px]">
                  {cleaner.isUnassigned ? "Unassigned" : cleaner.firstName}
                </div>
              )}
            </div>
          ))}
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
              const slotTime = formatTime(
                windowRange.startMinutes + slotIndex * MINUTES_PER_SLOT
              );

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
                  {cleanerColumns.map((cleaner) => (
                    <DaySlotCell
                      key={`${cleaner.id}-${slotIndex}`}
                      id={getSlotId(cleaner.id, slotIndex)}
                      showHourLine={showHourLine}
                      dropEnabled={dropEnabled}
                      onClick={() => {
                        if (isDragging) return;
                        onAddClick?.(date, slotTime, cleaner.id);
                      }}
                    />
                  ))}
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
              {cleanerColumns.map((cleaner) => {
                const positioned = positionedByCleaner[cleaner.id] || [];
                return (
                  <div key={cleaner.id} className="relative h-full">
                    {previewRange && previewRange.cleanerId === cleaner.id && (
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
                          <span
                            className={cn(
                              "absolute left-1 rounded bg-white px-1 text-[8px] font-medium text-slate-600 shadow-sm lg:text-[10px]",
                              "top-0 -translate-y-full -mt-1"
                            )}
                          >
                            {previewRange.startLabel}
                          </span>
                          <span
                            className={cn(
                              "absolute left-1 rounded bg-white px-1 text-[8px] font-medium text-slate-600 shadow-sm lg:text-[10px]",
                              "bottom-0 translate-y-full mt-1"
                            )}
                          >
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
                              showAssignee={cleaner.isUnassigned}
                              variant="week"
                              className="h-full"
                              dragEnabled={dropEnabled}
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
