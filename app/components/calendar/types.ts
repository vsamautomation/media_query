export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string; // "HH:mm" format
  endTime: string; // "HH:mm" format
  jobId?: number | string;
  customerName?: string;
  assigneeInitials?: string;
  assigneeAvatarUrl?: string;
  assigneeId?: string | null;
  assigneeName?: string;
  category?: string;
  status?: "confirmed" | "pending" | "cancelled";
  assignees?: { name: string; avatar?: string; initials: string }[];
  color?: string;
  metadata?: Record<string, unknown>;
}
