import type { CalendarEvent } from "./types";

interface EventDragOverlayProps {
  event: CalendarEvent;
}

export default function EventDragOverlay({ event }: EventDragOverlayProps) {
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

  return (
    <div className="w-40 rounded-sm border border-slate-200 bg-white px-2 py-1 text-slate-800 shadow-lg">
      <div className="flex items-center gap-1">
        {jobLabel && (
          <span className="text-[8px] font-medium text-slate-400 lg:text-[10px]">
            {jobLabel}
          </span>
        )}
      </div>
      <div className="truncate text-[10px] font-semibold lg:text-[12px]">
        {customerLabel}
      </div>
      <div className="mt-0.5 flex items-center justify-between text-[8px] text-slate-500 lg:text-[10px]">
        <span>{timeLabel}</span>
        {assigneeAvatarUrl ? (
          <img
            src={assigneeAvatarUrl}
            alt=""
            className="h-4 w-4 rounded-full object-cover lg:h-5 lg:w-5"
          />
        ) : assigneeInitials ? (
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[8px] font-semibold text-slate-700 lg:h-5 lg:w-5 lg:text-[10px]">
            {assigneeInitials}
          </span>
        ) : (
          <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-200">
            <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full border border-white bg-rose-100 text-[8px] font-semibold text-rose-600 lg:h-3.5 lg:w-3.5 lg:text-[9px]">
              +
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
