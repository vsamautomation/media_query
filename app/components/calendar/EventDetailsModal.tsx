import type { CalendarEvent } from "~/components/calendar/MonthView";

interface EventDetailsModalProps {
  isOpen: boolean;
  event: CalendarEvent | null;
  onClose: () => void;
}

export default function EventDetailsModal({ isOpen, event, onClose }: EventDetailsModalProps) {
  if (!isOpen || !event) return null;

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-lg"
        onClick={(eventClick) => eventClick.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Event details</div>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {event.jobId ? `Job #${event.jobId}` : event.id}
        </div>
        <div className="mt-3 space-y-2 text-sm text-slate-700">
          <div>
            <span className="text-xs text-slate-500">Customer</span>
            <div className="font-medium">{event.customerName || event.title}</div>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>{event.date.toLocaleDateString()}</span>
            <span>
              {event.startTime}
              {event.endTime ? `-${event.endTime}` : ""}
            </span>
          </div>
          {event.metadata?.status && (
            <div className="text-xs text-slate-500">
              Status: {String(event.metadata.status)}
            </div>
          )}
          {event.metadata?.priority && (
            <div className="text-xs text-slate-500">
              Priority: {String(event.metadata.priority)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
