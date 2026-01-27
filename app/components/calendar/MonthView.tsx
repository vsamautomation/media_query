import { useMemo } from "react";

// Types
export interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  startTime: string; // "HH:mm" format
  endTime: string;   // "HH:mm" format
  category?: string;
  status?: "confirmed" | "pending" | "cancelled";
  assignees?: { name: string; avatar?: string; initials: string }[];
  color?: string;
  metadata?: Record<string, unknown>;
}

export interface MonthViewProps {
  // Data
  year: number;
  month: number; // 0-indexed (0 = January)
  events: CalendarEvent[];

  // Display options
  maxEventsPerDay?: number;
  showWeekNumbers?: boolean;
  weekStartsOn?: 0 | 1; // 0 = Sunday, 1 = Monday

  // Callbacks
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMoreClick?: (date: Date, events: CalendarEvent[]) => void;
  onNavigate?: (year: number, month: number) => void;

  // Custom rendering
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
  renderDayHeader?: (date: Date) => React.ReactNode;
}

// Helper functions
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

function getDaysInMonth(year: number, month: number, weekStartsOn: 0 | 1 = 0): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];

  // Calculate offset based on week start
  let firstDayOfWeek = firstDay.getDay();
  if (weekStartsOn === 1) {
    firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  }

  // Add days from previous month to fill the first week
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }

  // Add all days of current month
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete the last week
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }

  return days;
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

function sortEventsByTime(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));
}

// Default Event Card Component
function DefaultEventCard({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick?: (event: CalendarEvent) => void;
}) {
  return (
    <div
      className="bg-[#f0f0f0] hover:bg-[#e8e8e8] rounded px-1 sm:px-1.5 py-0.5 sm:py-1 mb-0.5 cursor-pointer transition-colors text-left"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(event);
      }}
    >
      {event.category && (
        <div className="text-[8px] sm:text-[10px] text-[#7c7c7c] truncate">{event.category}</div>
      )}
      <div className="text-[10px] sm:text-[12px] font-medium text-[#1a1a1a] leading-tight truncate">
        {event.title}
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0.5 sm:gap-1 text-[8px] sm:text-[10px] text-[#7c7c7c]">
          <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full border border-[#7c7c7c]" />
          <span className="hidden xs:inline">
            {event.startTime}-{event.endTime}
          </span>
          <span className="xs:hidden">
            {event.startTime}
          </span>
        </div>
        {event.assignees && event.assignees.length > 0 && (
          <div className="hidden sm:flex -space-x-1">
            {event.assignees.slice(0, 2).map((assignee, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-[#7b68ee] text-white text-[8px] font-medium flex items-center justify-center border border-white"
                title={assignee.name}
              >
                {assignee.initials}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Day Cell Component
function DayCell({
  date,
  isCurrentMonth,
  events,
  maxEventsPerDay,
  onDayClick,
  onEventClick,
  onMoreClick,
  renderEvent,
}: {
  date: Date;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
  maxEventsPerDay: number;
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMoreClick?: (date: Date, events: CalendarEvent[]) => void;
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
}) {
  const sortedEvents = useMemo(() => sortEventsByTime(events), [events]);
  const today = isToday(date);
  const hiddenCount = sortedEvents.length - maxEventsPerDay;

  return (
    <div
      className={`min-h-[80px] sm:min-h-[100px] md:min-h-[120px] border-l border-[#e5e5e5] p-0.5 sm:p-1 flex flex-col ${
        !isCurrentMonth ? "opacity-30" : ""
      } ${onDayClick ? "cursor-pointer hover:bg-[#fafafa]" : ""}`}
      onClick={() => onDayClick?.(date)}
    >
      {/* Events */}
      <div className="flex-1">
        {sortedEvents.slice(0, maxEventsPerDay).map((event) =>
          renderEvent ? (
            <div key={event.id} onClick={(e) => e.stopPropagation()}>
              {renderEvent(event)}
            </div>
          ) : (
            <DefaultEventCard
              key={event.id}
              event={event}
              onClick={onEventClick}
            />
          )
        )}
        {hiddenCount > 0 && (
          <div
            className="text-[8px] sm:text-[10px] text-[#7c7c7c] px-0.5 sm:px-1 cursor-pointer hover:text-[#333]"
            onClick={(e) => {
              e.stopPropagation();
              onMoreClick?.(date, sortedEvents);
            }}
          >
            +{hiddenCount}
          </div>
        )}
      </div>
      {/* Day number at bottom right */}
      <div className="flex justify-end mt-0.5 sm:mt-1">
        <span
          className={`text-[11px] sm:text-[13px] ${
            today
              ? "bg-primary text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center"
              : "text-[#7c7c7c]"
          }`}
        >
          {date.getDate()}
        </span>
      </div>
    </div>
  );
}

// Week Row Component
function WeekRow({
  days,
  currentMonth,
  events,
  maxEventsPerDay,
  showWeekNumbers,
  onDayClick,
  onEventClick,
  onMoreClick,
  renderEvent,
}: {
  days: Date[];
  currentMonth: number;
  events: CalendarEvent[];
  maxEventsPerDay: number;
  showWeekNumbers: boolean;
  onDayClick?: (date: Date) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onMoreClick?: (date: Date, events: CalendarEvent[]) => void;
  renderEvent?: (event: CalendarEvent) => React.ReactNode;
}) {
  const weekNumber = getWeekNumber(days[0]);

  const getEventsForDate = (date: Date) =>
    events.filter((event) => isSameDay(event.date, date));

  return (
    <div
      className={`grid border-b border-[#e5e5e5] ${
        showWeekNumbers
          ? "grid-cols-[28px_repeat(7,minmax(40px,1fr))] sm:grid-cols-[32px_repeat(7,minmax(60px,1fr))] md:grid-cols-[40px_repeat(7,minmax(100px,1fr))]"
          : "grid-cols-[repeat(7,minmax(40px,1fr))] sm:grid-cols-[repeat(7,minmax(60px,1fr))] md:grid-cols-[repeat(7,minmax(100px,1fr))]"
      }`}
    >
      {/* Week number column */}
      {showWeekNumbers && (
        <div className="border-l border-[#e5e5e5] p-1 sm:p-2 flex items-end justify-center">
          <span className="text-[9px] sm:text-[11px] text-[#7c7c7c]">
            {String(weekNumber).padStart(2, "0")}
          </span>
        </div>
      )}
      {/* Day cells */}
      {days.map((date, i) => (
        <DayCell
          key={i}
          date={date}
          isCurrentMonth={date.getMonth() === currentMonth}
          events={getEventsForDate(date)}
          maxEventsPerDay={maxEventsPerDay}
          onDayClick={onDayClick}
          onEventClick={onEventClick}
          onMoreClick={onMoreClick}
          renderEvent={renderEvent}
        />
      ))}
    </div>
  );
}

// Main MonthView Component
export function MonthView({
  year,
  month,
  events,
  maxEventsPerDay = 3,
  showWeekNumbers = true,
  weekStartsOn = 0,
  onDayClick,
  onEventClick,
  onMoreClick,
  renderEvent,
}: MonthViewProps) {
  const days = useMemo(
    () => getDaysInMonth(year, month, weekStartsOn),
    [year, month, weekStartsOn]
  );

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      result.push(days.slice(i, i + 7));
    }
    return result;
  }, [days]);

  const dayNames = useMemo(() => {
    const names =
      weekStartsOn === 0
        ? ["Sun", "Mon", "Tues", "Wed", "Thur", "Friday", "Satur"]
        : ["Mon", "Tues", "Wed", "Thur", "Friday", "Satur", "Sun"];
    return names;
  }, [weekStartsOn]);

  // Short day names for mobile
  const shortDayNames = useMemo(() => {
    const names =
      weekStartsOn === 0
        ? ["S", "M", "T", "W", "T", "F", "S"]
        : ["M", "T", "W", "T", "F", "S", "S"];
    return names;
  }, [weekStartsOn]);

  return (
    <div className="overflow-x-auto">
      <div className="border border-[#e5e5e5] bg-white min-w-0 md:min-w-[800px]">
        {/* Day headers */}
        <div
          className={`grid border-b border-[#e5e5e5] ${
            showWeekNumbers
              ? "grid-cols-[28px_repeat(7,minmax(40px,1fr))] sm:grid-cols-[32px_repeat(7,minmax(60px,1fr))] md:grid-cols-[40px_repeat(7,minmax(100px,1fr))]"
              : "grid-cols-[repeat(7,minmax(40px,1fr))] sm:grid-cols-[repeat(7,minmax(60px,1fr))] md:grid-cols-[repeat(7,minmax(100px,1fr))]"
          }`}
        >
          {showWeekNumbers && (
            <div className="p-1 sm:p-2 text-center border-l border-[#e5e5e5]">
              <span className="text-[9px] sm:text-[11px] text-[#7c7c7c]">WN</span>
            </div>
          )}
          {dayNames.map((day, i) => (
            <div key={i} className="border-l border-[#e5e5e5] p-1 sm:p-2">
              <span className="text-[9px] sm:text-[11px] font-semibold text-[#333]">
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{shortDayNames[i]}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Week rows */}
        {weeks.map((weekDays, i) => (
          <WeekRow
            key={i}
            days={weekDays}
            currentMonth={month}
            events={events}
            maxEventsPerDay={maxEventsPerDay}
            showWeekNumbers={showWeekNumbers}
            onDayClick={onDayClick}
            onEventClick={onEventClick}
            onMoreClick={onMoreClick}
            renderEvent={renderEvent}
          />
        ))}
      </div>
    </div>
  );
}

export default MonthView;
