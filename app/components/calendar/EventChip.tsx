import { useDraggable } from "@dnd-kit/core";
import { cn } from "~/lib/utils";
import type { CalendarEvent } from "./types";

interface EventChipProps {
  event: CalendarEvent;
  dragEnabled?: boolean;
  onClick?: (event: CalendarEvent) => void;
  onAssigneeClick?: (event: CalendarEvent, anchor: { x: number; y: number }) => void;
  showAssignee?: boolean;
  className?: string;
  variant?: "month" | "week";
  useDragOverlay?: boolean;
}

export default function EventChip({
  event,
  dragEnabled = false,
  onClick,
  onAssigneeClick,
  showAssignee = true,
  className,
  variant = "month",
  useDragOverlay = true,
}: EventChipProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    disabled: !dragEnabled,
  });
  const dragStyle =
    !useDragOverlay && transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : undefined;

  const color = event.color || "#e2e8f0";
  const title = `${event.title}${event.startTime ? ` (${event.startTime}-${event.endTime})` : ""}`;
  const jobLabel =
    event.jobId !== undefined && event.jobId !== null
      ? `#${event.jobId}`
      : event.category || "";
  const customerLabel = event.customerName || event.title;
  const timeLabel =
    event.startTime && event.endTime
      ? `${event.startTime}-${event.endTime}`
      : event.startTime || "";
  const assigneeInitials =
    event.assigneeInitials || event.assignees?.[0]?.initials;
  const assigneeAvatarUrl = event.assigneeAvatarUrl;
  const isUnassigned = !assigneeAvatarUrl && !assigneeInitials;
  const assigneeAria = !isUnassigned
    ? `Edit assignee for job ${event.jobId ?? event.id}`
    : `Assign cleaner for job ${event.jobId ?? event.id}`;
  const isWeekVariant = variant === "week";
  const primaryLabel = jobLabel || event.title;
  const secondaryLabel = event.customerName;

  const rootClasses = isWeekVariant
    ? "group relative flex h-full w-full min-w-0 select-none items-start gap-1 rounded-sm border border-slate-200 bg-slate-50 px-1 py-0.5 pr-2 text-left text-[9px] text-slate-700 transition-[transform,box-shadow,opacity] duration-150 ease-out hover:bg-slate-100 lg:text-[10px]"
    : "group flex w-full min-w-0 select-none rounded-sm border border-slate-200 bg-slate-50 px-1 py-1 text-left text-slate-800 transition-[transform,box-shadow,opacity] duration-150 ease-out hover:bg-slate-100";

  const assigneeButton = showAssignee ? (
    <button
      type="button"
      className={cn(
        "relative inline-flex items-center justify-center rounded-full font-semibold transition",
        isWeekVariant
          ? "h-4 w-4 text-[8px] lg:h-5 lg:w-5 lg:text-[9px]"
          : "h-4 w-4 text-[8px] sm:h-5 sm:w-5 sm:text-[9px] lg:h-6 lg:w-6 lg:text-[10px]",
        isUnassigned ? "bg-slate-200 hover:bg-slate-300" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
      )}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onAssigneeClick?.(event, { x: e.clientX, y: e.clientY });
      }}
      aria-label={assigneeAria}
    >
      {isUnassigned ? (
        <>
          <span className="h-full w-full rounded-full bg-slate-200" />
          <span
            className={cn(
              "absolute -bottom-0.5 -right-0.5 inline-flex items-center justify-center rounded-full border border-white bg-rose-100 font-semibold text-rose-600",
              isWeekVariant
                ? "h-3 w-3 text-[8px] lg:h-3.5 lg:w-3.5 lg:text-[9px]"
                : "h-3 w-3 text-[8px] sm:h-3.5 sm:w-3.5 sm:text-[9px] lg:h-4 lg:w-4 lg:text-[10px]"
            )}
          >
            +
          </span>
        </>
      ) : assigneeAvatarUrl ? (
        <img
          src={assigneeAvatarUrl}
          alt=""
          className={cn(
            "rounded-full object-cover",
            isWeekVariant ? "h-4 w-4 lg:h-5 lg:w-5" : "h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6"
          )}
        />
      ) : (
        assigneeInitials
      )}
    </button>
  ) : null;

  return (
    <div
      ref={setNodeRef}
      // role="button"
      // tabIndex={0}
      className={cn(
        rootClasses,
        dragEnabled ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        isDragging && (useDragOverlay ? "opacity-0" : "scale-[1.01] opacity-80 shadow-sm"),
        className
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick?.(event);
        }
      }}
      title={title}
      aria-label={title}
      style={{ ...dragStyle, touchAction: dragEnabled ? "none" : "auto" }}
      {...attributes}
      {...listeners}
    >
      {isWeekVariant ? (
        <>
          <div className="flex min-w-0 flex-col gap-0.5">
            <div className="flex min-w-0 items-start gap-1">
              <span
                className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="min-w-0 truncate text-[9px] font-semibold leading-tight text-slate-700 lg:text-[11px]">
                {primaryLabel}
              </span>
            </div>
            {secondaryLabel && (
              <span className="min-w-0 truncate text-[8px] leading-tight text-slate-500 lg:text-[10px]">
                {secondaryLabel}
              </span>
            )}
          </div>
          {assigneeButton && (
            <div className="absolute bottom-0.5 right-0.5">{assigneeButton}</div>
          )}
        </>
      ) : (
        <div className="flex w-full min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            {jobLabel && (
              <span className="text-[8px] font-medium text-slate-400 sm:text-[9px] lg:text-[10px]">
                {jobLabel}
              </span>
            )}
          </div>
          <div className="min-w-0 truncate text-[10px] font-semibold text-slate-800 sm:text-[11px] lg:text-[12px]">
            {customerLabel}
          </div>
          <div
            className={cn(
              "mt-0.5 flex items-center gap-2",
              showAssignee ? "justify-between" : "justify-start"
            )}
          >
            <span className="text-[8px] text-slate-500 sm:text-[9px] lg:text-[10px]">
              {timeLabel}
            </span>
            {assigneeButton}
          </div>
        </div>
      )}
    </div>
  );
}
