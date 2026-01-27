import type { Route } from "../+types/home";
import { useState } from "react";
import { MonthView, type CalendarEvent } from "~/components/calendar/MonthView";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Bookings - Clengo" },
    { name: "description", content: "Manage your bookings and appointments" },
  ];
}

// Sample data
const sampleEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Team Meeting",
    category: "Project 1",
    startTime: "09:00",
    endTime: "10:00",
    date: new Date(2026, 1, 3),
    status: "confirmed",
    assignees: [
      { name: "John Doe", initials: "JD" },
      { name: "Jane Smith", initials: "JS" },
    ],
  },
  {
    id: "2",
    title: "Client Call",
    category: "Project 1",
    startTime: "14:00",
    endTime: "15:00",
    date: new Date(2026, 1, 3),
    status: "pending",
    assignees: [{ name: "John Doe", initials: "JD" }],
  },
  {
    id: "3",
    title: "Project Review",
    category: "Project 1",
    startTime: "11:00",
    endTime: "12:30",
    date: new Date(2026, 1, 6),
    status: "confirmed",
    assignees: [
      { name: "Jane Smith", initials: "JS" },
      { name: "Mike Brown", initials: "MB" },
    ],
  },
  {
    id: "4",
    title: "Design Review",
    category: "Project 1",
    startTime: "16:00",
    endTime: "17:00",
    date: new Date(2026, 1, 3),
    status: "confirmed",
    assignees: [{ name: "Jane Smith", initials: "JS" }],
  },
  {
    id: "5",
    title: "Sprint Planning",
    category: "Project 1",
    startTime: "10:00",
    endTime: "11:00",
    date: new Date(2026, 1, 3),
    status: "pending",
    assignees: [{ name: "Mike Brown", initials: "MB" }],
  },
];

export default function Bookings() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 1));
  const [events] = useState<CalendarEvent[]>(sampleEvents);

  const handleDayClick = (date: Date) => {
    console.log("Day clicked:", date);
    // Could open a modal to create new event
  };

  const handleEventClick = (event: CalendarEvent) => {
    console.log("Event clicked:", event);
    // Could open event details modal
  };

  const handleMoreClick = (date: Date, dayEvents: CalendarEvent[]) => {
    console.log("More clicked:", date, dayEvents);
    // Could open a popover showing all events
  };

  return (
    <div className="min-h-screen bg-white">
      <MonthView
        year={currentDate.getFullYear()}
        month={currentDate.getMonth()}
        events={events}
        maxEventsPerDay={3}
        showWeekNumbers={true}
        weekStartsOn={0}
        onDayClick={handleDayClick}
        onEventClick={handleEventClick}
        onMoreClick={handleMoreClick}
      />
    </div>
  );
}
