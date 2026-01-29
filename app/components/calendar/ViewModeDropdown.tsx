import { useMemo } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import type { CalendarViewMode } from "~/components/calendar/viewTypes";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type ViewOption = {
  value: CalendarViewMode;
  label: string;
  shortcut: string;
};

const options: ViewOption[] = [
  { value: "month", label: "Month", shortcut: "M" },
  { value: "week", label: "Week", shortcut: "W" },
  { value: "day", label: "Day", shortcut: "D" },
  { value: "table", label: "Table", shortcut: "T" },
];

interface ViewModeDropdownProps {
  value: CalendarViewMode;
  onChange: (value: CalendarViewMode) => void;
}

export default function ViewModeDropdown({ value, onChange }: ViewModeDropdownProps) {
  const current = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [value]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1 bg-white px-2 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus-visible:border-slate-200 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <CalendarDays className="h-3.5 w-3.5 text-slate-500" />
          {current.label}
          <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40 text-[11px]">
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              className={`text-[11px] ${
                isSelected ? "bg-slate-50 text-slate-900" : "text-slate-700"
              }`}
              onSelect={() => onChange(option.value)}
            >
              <span className="flex-1">{option.label}</span>
              <DropdownMenuShortcut>{option.shortcut}</DropdownMenuShortcut>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
