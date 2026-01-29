interface AddBookingModalProps {
  isOpen: boolean;
  date: Date | null;
  startTime?: string | null;
  onClose: () => void;
}

export default function AddBookingModal({
  isOpen,
  date,
  startTime,
  onClose,
}: AddBookingModalProps) {
  if (!isOpen || !date) return null;
  const dateLabel = date.toLocaleDateString();
  const timeLabel = startTime ? `• ${startTime}` : "";

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/30 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xs rounded-lg border border-slate-200 bg-white p-4 text-slate-900 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">Add booking</div>
          <button
            type="button"
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          {dateLabel} {timeLabel}
        </div>
        <div className="mt-3 rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
          Add booking will be here
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
