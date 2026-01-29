interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-3 bg-white px-4 py-2 text-[12px] text-slate-600">
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-slate-800">
          {title}
        </div>
        {subtitle ? (
          <div className="truncate text-[11px] text-slate-500">{subtitle}</div>
        ) : null}
      </div>
      {actions ? <div className="ml-auto flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
