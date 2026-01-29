import { useMemo } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  CircleCheck,
  Clock,
  Hourglass,
  UserCheck,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

export type StatusFilterValue =
  | "status"
  | "open"
  | "closed"
  | "assigned"
  | "in-progress";

type StatusOption = {
  value: StatusFilterValue;
  label: string;
  icon: typeof Circle;
  colorClass: string;
};

const options: StatusOption[] = [
  {
    value: "status",
    label: "Status",
    icon: Hourglass,
    colorClass: "text-slate-400",
  },
  {
    value: "open",
    label: "Open",
    icon: Circle,
    colorClass: "text-amber-600",
  },
  {
    value: "closed",
    label: "Closed",
    icon: CircleCheck,
    colorClass: "text-slate-500",
  },
  {
    value: "assigned",
    label: "Assigned",
    icon: UserCheck,
    colorClass: "text-sky-600",
  },
  {
    value: "in-progress",
    label: "In progress",
    icon: Clock,
    colorClass: "text-indigo-600",
  },
];

interface StatusFilterDropdownProps {
  value: StatusFilterValue;
  onChange: (value: StatusFilterValue) => void;
}

export default function StatusFilterDropdown({
  value,
  onChange,
}: StatusFilterDropdownProps) {
  const current = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [value]
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 items-center justify-center gap-1 px-0 text-[11px] font-semibold text-slate-600 hover:bg-slate-100 focus-visible:border-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:w-auto md:px-2"
          aria-label={`Status filter: ${current.label}`}
        >
          <current.icon className={`h-3.5 w-3.5 ${current.colorClass}`} />
          <span className="hidden truncate text-left md:inline">{current.label}</span>
          <ChevronDown className="hidden h-3 w-3 text-slate-500 md:inline" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 text-[11px]">
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              className={`gap-2 text-[11px] ${
                isSelected ? "bg-slate-50 text-slate-900" : "text-slate-700"
              }`}
              onSelect={() => onChange(option.value)}
            >
              <Icon className={`h-3.5 w-3.5 ${option.colorClass}`} />
              <span className="flex-1">{option.label}</span>
              {isSelected && <Check className="h-3 w-3 text-slate-400" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
