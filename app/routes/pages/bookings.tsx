import type { Route } from "../+types/home";
import { useEffect, useState } from "react";
import { MonthView, type CalendarEvent } from "~/components/calendar/MonthView";
import CalendarNav from "~/components/calendar/CalendarNav";
import type { StatusFilterValue } from "~/components/calendar/StatusFilterDropdown";
import { WeekView } from "~/components/calendar/WeekView";
import { DayView } from "~/components/calendar/DayView";
import { TableView } from "~/components/views/TableView";
import AddBookingModal from "~/components/calendar/AddBookingModal";
import AssignCleanerPopover from "~/components/calendar/AssignCleanerPopover";
import EventDetailsModal from "~/components/calendar/EventDetailsModal";
import AppSidebar from "~/components/layout/AppSidebar";
import PageHeader from "~/components/layout/PageHeader";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import sampleJobs from "~/data/sample-jobs.json";
import sampleCleaners from "~/data/sample-cleaners.json";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bookings - Clengo" },
    { name: "description", content: "Manage your bookings and appointments" },
  ];
}

type SampleJob = {
  $id: string;
  jobID: number;
  customerID: string;
  assigned: string | null;
  jobType: string;
  status: string;
  priority: string;
  startDate: string;
  startTime: string;
  endTime: string;
};

type SampleCleaner = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  initials: string;
  isAvailable: boolean;
  suspended: boolean;
  profilePicUrl: string | null;
};

const customerNames: Record<string, string> = {
  cust_001: "Ava Wood",
  cust_002: "Noah Clarke",
  cust_003: "Maya Patel",
  cust_004: "Ethan Brooks",
  cust_005: "Sophia Reed",
  cust_006: "Liam Ross",
  cust_007: "Isla Quinn",
  cust_008: "Lucas Gray",
  cust_009: "Amelia Hart",
  cust_010: "Olivia Ward",
  cust_011: "James Hill",
  cust_012: "Chloe King",
  cust_013: "Henry Cole",
  cust_014: "Ella Knight",
  cust_015: "Jack Moss",
};

const cleaners = sampleCleaners as SampleCleaner[];
const cleanerMap = cleaners.reduce<Record<string, SampleCleaner>>(
  (acc, cleaner) => {
    acc[cleaner.id] = cleaner;
    return acc;
  },
  {},
);

const statusColors: Record<string, string> = {
  assigned: "#bfdbfe",
  open: "#fde68a",
  "in progress": "#c7d2fe",
  completed: "#bbf7d0",
  cancelled: "#fecaca",
};

const formatClock = (value: string) =>
  new Date(value).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

const mapJobsToEvents = (jobs: SampleJob[]): CalendarEvent[] =>
  jobs.map((job) => ({
    id: job.$id,
    title: job.jobType,
    jobId: job.jobID,
    customerName: customerNames[job.customerID] || job.customerID,
    assigneeInitials: job.assigned
      ? cleanerMap[job.assigned]?.initials
      : undefined,
    assigneeAvatarUrl: job.assigned
      ? cleanerMap[job.assigned]?.profilePicUrl || undefined
      : undefined,
    assigneeName: job.assigned
      ? `${cleanerMap[job.assigned]?.firstName ?? ""} ${
          cleanerMap[job.assigned]?.lastName ?? ""
        }`.trim() || undefined
      : undefined,
    assigneeId: job.assigned,
    date: new Date(job.startDate),
    startTime: formatClock(job.startTime),
    endTime: formatClock(job.endTime),
    status: job.status.toLowerCase().includes("cancel")
      ? "cancelled"
      : job.status.toLowerCase().includes("open")
        ? "pending"
        : "confirmed",
    color: statusColors[job.status.toLowerCase()] || "#e2e8f0",
    metadata: {
      priority: job.priority,
      status: job.status,
      address: job.address,
      relatedJobId: job.relatedJobID,
    },
  }));

export default function Bookings() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1));
  const [viewMode, setViewMode] = useState<"month" | "week" | "day" | "table">(
    "week",
  );
  const [lastCalendarView, setLastCalendarView] = useState<
    "month" | "week" | "day"
  >("week");
  const [events, setEvents] = useState<CalendarEvent[]>(() =>
    mapJobsToEvents(sampleJobs as SampleJob[]),
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [addDate, setAddDate] = useState<Date | null>(null);
  const [addStartTime, setAddStartTime] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [assignAnchor, setAssignAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("status");
  const weekStartsOn: 0 | 1 = 0;

  const handleDayClick = (date: Date) => {
    setCurrentDate(new Date(date));
    setLastCalendarView("day");
    setViewMode("day");
  };

  const handleViewModeChange = (mode: "month" | "week" | "day" | "table") => {
    if (mode === "table") {
      setViewMode("table");
    } else {
      setLastCalendarView(mode);
      setViewMode(mode);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const tagName = target.tagName?.toLowerCase();
      if (tagName === "input" || tagName === "textarea" || tagName === "select")
        return;
      if (target.isContentEditable) return;

      const key = event.key.toLowerCase();
      if (key === "m") {
        handleViewModeChange("month");
      } else if (key === "w") {
        handleViewModeChange("week");
      } else if (key === "d") {
        handleViewModeChange("day");
      } else if (key === "t") {
        handleViewModeChange("table");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleViewModeChange]);

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(prev.getMonth() - 1);
      } else if (viewMode === "week" || viewMode === "table") {
        next.setDate(prev.getDate() - 7);
      } else {
        next.setDate(prev.getDate() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (viewMode === "month") {
        next.setMonth(prev.getMonth() + 1);
      } else if (viewMode === "week" || viewMode === "table") {
        next.setDate(prev.getDate() + 7);
      } else {
        next.setDate(prev.getDate() + 1);
      }
      return next;
    });
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleMoreClick = (date: Date, dayEvents: CalendarEvent[]) => {
    console.log("More clicked:", date, dayEvents);
    // Could open a popover showing all events
  };

  const handleAddClick = (
    date: Date,
    startTime?: string,
    _cleanerId?: string | null,
  ) => {
    setAddDate(date);
    setAddStartTime(startTime ?? null);
    setShowAddModal(true);
  };

  const handleAddClose = () => {
    setShowAddModal(false);
    setAddDate(null);
    setAddStartTime(null);
  };

  const handleEventDrop = (event: CalendarEvent, newDate: Date) => {
    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id ? { ...item, date: new Date(newDate) } : item,
      ),
    );
  };

  const handleWeekEventDrop = (
    event: CalendarEvent,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
  ) => {
    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? {
              ...item,
              date: new Date(newDate),
              startTime: newStartTime,
              endTime: newEndTime,
            }
          : item,
      ),
    );
  };

  const handleDayEventDrop = (
    event: CalendarEvent,
    newDate: Date,
    newStartTime: string,
    newEndTime: string,
    newAssigneeId: string | null,
  ) => {
    const assignee = newAssigneeId ? cleanerMap[newAssigneeId] : null;
    const assigneeName = assignee
      ? `${assignee.firstName} ${assignee.lastName}`
      : "Unassigned";
    const jobLabel = event.jobId ? `#${event.jobId}` : event.id;
    const confirmed = window.confirm(
      `Move job ${jobLabel} to ${newStartTime}-${newEndTime} and assign to ${assigneeName}?`,
    );
    if (!confirmed) return;

    setEvents((prev) =>
      prev.map((item) =>
        item.id === event.id
          ? {
              ...item,
              date: new Date(newDate),
              startTime: newStartTime,
              endTime: newEndTime,
              assigneeId: newAssigneeId,
              assigneeInitials: assignee?.initials,
              assigneeAvatarUrl: assignee?.profilePicUrl || undefined,
            }
          : item,
      ),
    );
  };

  const handleAssigneeClick = (
    event: CalendarEvent,
    anchor: { x: number; y: number },
  ) => {
    setSelectedEvent(event);
    setShowAssignModal(true);
    setAssignAnchor(anchor);
  };

  const handleAssignClose = () => {
    setShowAssignModal(false);
    setSelectedEvent(null);
    setAssignAnchor(null);
  };

  const handleEventClose = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
  };

  const assigneeOptions = cleaners.filter((cleaner) => !cleaner.suspended);

  return (
    <SidebarProvider
      defaultOpen={false}
      className="!bg-white has-data-[variant=inset]:!bg-white"
      style={{ backgroundColor: "#ffffff" }}
    >
      <AppSidebar />
      <SidebarInset className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="relative min-h-screen bg-white">
          <PageHeader
            title="Bookings"
            actions={
              <div className="inline-flex items-center overflow-hidden rounded-md border border-slate-200 bg-white">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none px-3 text-[11px] font-semibold",
                    viewMode === "table"
                      ? "text-slate-600 hover:bg-slate-100 hover:text-slate-700"
                      : "bg-[#2a436c] text-white hover:bg-[#22395d] hover:text-white",
                  )}
                  onClick={() => handleViewModeChange(lastCalendarView)}
                >
                  Calendar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "rounded-none px-3 text-[11px] font-semibold",
                    viewMode === "table"
                      ? "bg-[#2a436c] text-white hover:bg-[#22395d] hover:text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-700",
                  )}
                  onClick={() => handleViewModeChange("table")}
                >
                  Table
                </Button>
              </div>
            }
          />
          <CalendarNav
            viewMode={viewMode}
            currentDate={currentDate}
            weekStartsOn={weekStartsOn}
            onViewModeChange={handleViewModeChange}
            onToday={handleToday}
            onPrev={handlePrev}
            onNext={handleNext}
            onAddTask={() => handleAddClick(currentDate)}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
          {viewMode === "month" && (
            <MonthView
              year={currentDate.getFullYear()}
              month={currentDate.getMonth()}
              events={events}
              maxEventsPerDay={3}
              showWeekNumbers={false}
              weekStartsOn={weekStartsOn}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
              onMoreClick={handleMoreClick}
              onAddClick={handleAddClick}
              onAssigneeClick={handleAssigneeClick}
              onEventDrop={handleEventDrop}
            />
          )}
          {viewMode === "week" && (
            <WeekView
              date={currentDate}
              events={events}
              weekStartsOn={weekStartsOn}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
              onAddClick={handleAddClick}
              onAssigneeClick={handleAssigneeClick}
              onEventDrop={handleWeekEventDrop}
            />
          )}
          {viewMode === "day" && (
            <DayView
              date={currentDate}
              events={events}
              cleaners={assigneeOptions}
              onEventClick={handleEventClick}
              onAddClick={handleAddClick}
              onEventDrop={handleDayEventDrop}
            />
          )}
          {viewMode === "table" && (
            <TableView
              date={currentDate}
              events={events}
              weekStartsOn={weekStartsOn}
              onEventClick={handleEventClick}
            />
          )}
          <AddBookingModal
            isOpen={showAddModal}
            date={addDate}
            startTime={addStartTime}
            onClose={handleAddClose}
          />
          <AssignCleanerPopover
            isOpen={showAssignModal}
            anchor={assignAnchor}
            assignees={assigneeOptions}
            selectedEvent={selectedEvent}
            onClose={handleAssignClose}
          />
          <EventDetailsModal
            isOpen={showEventModal}
            event={selectedEvent}
            onClose={handleEventClose}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
