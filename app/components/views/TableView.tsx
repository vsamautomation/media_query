import { useMemo } from "react";
import { Repeat } from "lucide-react";
import type { CalendarEvent } from "~/components/calendar/types";
import { cn } from "~/lib/utils";

export interface TableViewProps {
  date: Date;
  events: CalendarEvent[];
  weekStartsOn?: 0 | 1;
  className?: string;
  onEventClick?: (event: CalendarEvent) => void;
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

function isWithinRange(date: Date, start: Date, end: Date) {
  return date >= start && date <= end;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getStatusStyles(status: string) {
  switch (status) {
    case "open":
      return "bg-amber-100 text-amber-700";
    case "assigned":
      return "bg-sky-100 text-sky-700";
    case "in progress":
      return "bg-indigo-100 text-indigo-700";
    case "completed":
    case "complete":
      return "bg-emerald-100 text-emerald-700";
    case "cancelled":
    case "canceled":
      return "bg-rose-100 text-rose-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function TableView({
  date,
  events,
  weekStartsOn = 0,
  className,
  onEventClick,
}: TableViewProps) {
  const start = useMemo(() => startOfWeek(date, weekStartsOn), [date, weekStartsOn]);
  const end = useMemo(() => addDays(start, 6), [start]);

  const rows = useMemo(() => {
    return events
      .filter((event) => isWithinRange(event.date, start, end))
      .sort((a, b) => {
        const dateDiff = a.date.getTime() - b.date.getTime();
        if (dateDiff !== 0) return dateDiff;
        return a.startTime.localeCompare(b.startTime);
      });
  }, [events, start, end]);

  const recurringMap = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((event) => {
      const related = event.metadata?.relatedJobId;
      if (related === null || related === undefined || related === "") return;
      const key = String(related);
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [events]);

  return (
    <div className={cn("w-full border border-slate-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[11px] text-slate-600 lg:text-[13px]">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 lg:text-[11px]">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Job</th>
              <th className="px-3 py-2 text-left font-semibold">Customer</th>
              <th className="px-3 py-2 text-left font-semibold">Schedule</th>
              <th className="px-3 py-2 text-left font-semibold">Assignee</th>
              <th className="px-3 py-2 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                  No bookings scheduled for this week.
                </td>
              </tr>
            ) : (
              rows.map((event) => {
                const jobLabel =
                  event.jobId !== undefined && event.jobId !== null
                    ? `#${event.jobId}`
                    : event.id;
                const relatedJobId = event.metadata?.relatedJobId;
                const isRecurring =
                  relatedJobId !== null &&
                  relatedJobId !== undefined &&
                  recurringMap.get(String(relatedJobId)) &&
                  recurringMap.get(String(relatedJobId))! > 1;
                const timeLabel = event.startTime
                  ? `${event.startTime}-${event.endTime}`
                  : "—";
                const assigneeInitials =
                  event.assigneeInitials || event.assignees?.[0]?.initials;
                const assigneeAvatar = event.assigneeAvatarUrl;
                const assigneeName =
                  event.assigneeName ||
                  event.assignees?.[0]?.name ||
                  (assigneeInitials ? assigneeInitials : "Unassigned");
                const assigneeFirstName = assigneeName.split(" ")[0] || assigneeName;
                const location =
                  (event.metadata?.address as string | undefined) ||
                  (event.metadata?.location as string | undefined);
                const statusRaw =
                  (event.metadata?.status as string | undefined) ||
                  event.status ||
                  "open";
                const statusLabel =
                  typeof statusRaw === "string" ? statusRaw.toLowerCase() : "open";
                const statusClass = getStatusStyles(statusLabel);
                return (
                  <tr
                    key={event.id}
                    className="border-t border-slate-100 hover:bg-slate-50/60"
                    onClick={() => onEventClick?.(event)}
                  >
                    <td className="px-3 py-2 font-semibold text-slate-700">
                      <div className="flex items-center gap-2">
                        {isRecurring ? (
                          <Repeat className="h-3.5 w-3.5 text-slate-500" />
                        ) : (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: event.color || "#e2e8f0" }}
                          />
                        )}
                        {jobLabel}
                      </div>
                      <div className="text-[10px] font-medium text-slate-400 lg:text-[11px]">
                        {event.title}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      <div className="font-semibold text-slate-700">
                        {event.customerName || event.title}
                      </div>
                      {location && (
                        <div className="text-[10px] text-slate-400 lg:text-[11px]">
                          {location}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-slate-700">
                        {formatDateLabel(event.date)}
                      </div>
                      <div className="text-[10px] text-slate-400 lg:text-[11px]">
                        {timeLabel}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {assigneeAvatar ? (
                          <img
                            src={assigneeAvatar}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                            {assigneeInitials || "—"}
                          </span>
                        )}
                        <span className="text-slate-600">
                          <span className="hidden md:inline">{assigneeName}</span>
                          <span className="hidden min-[421px]:inline md:hidden">
                            {assigneeFirstName}
                          </span>
                          <span className="inline min-[421px]:hidden">
                            {assigneeInitials || "—"}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize lg:text-[11px]",
                          statusClass
                        )}
                      >
                        {statusLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TableView;
