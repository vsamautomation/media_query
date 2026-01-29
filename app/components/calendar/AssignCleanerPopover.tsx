import type { CalendarEvent } from "~/components/calendar/MonthView";

interface AssigneeOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
}

interface AssignCleanerPopoverProps {
  isOpen: boolean;
  anchor: { x: number; y: number } | null;
  assignees: AssigneeOption[];
  selectedEvent: CalendarEvent | null;
  onClose: () => void;
}

export default function AssignCleanerPopover({
  isOpen,
  anchor,
  assignees,
  selectedEvent,
  onClose,
}: AssignCleanerPopoverProps) {
  if (!isOpen || !selectedEvent) return null;

  const width = 260;
  const height = 260;
  const padding = 12;

  const left =
    anchor && typeof window !== "undefined"
      ? Math.min(anchor.x + 8, window.innerWidth - width - padding)
      : 16;
  const top =
    anchor && typeof window !== "undefined"
      ? Math.min(anchor.y + 8, window.innerHeight - height - padding)
      : 80;

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className="fixed z-30 rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-xl"
        style={{ left, top, width }}
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <input
            type="text"
            placeholder="Search or enter email..."
            className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs text-slate-700 outline-none focus:border-slate-400"
          />
        </div>
        <div className="mt-2 text-[10px] font-semibold text-slate-500">Assignees</div>
        <div className="mt-2 space-y-1">
          {assignees.map((assignee) => (
            <button
              key={assignee.id}
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs hover:bg-slate-50"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-700">
                {assignee.initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-slate-700">
                  {assignee.firstName} {assignee.lastName}
                </div>
                <div className="truncate text-[10px] text-slate-400">{assignee.email}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
