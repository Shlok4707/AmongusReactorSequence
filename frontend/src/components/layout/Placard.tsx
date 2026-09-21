import { CrewmateIcon } from '../shared/CrewmateIcon';

interface PlacardProps {
  title: string;
  subtitle?: string;
  showIcon?: boolean;
}

export function Placard({ title, subtitle, showIcon }: PlacardProps) {
  return (
    <div className="metal-bevel brushed w-[132px] overflow-hidden rounded-md">
      <div className="flex flex-col items-center gap-1.5 px-2 py-3.5">
        {showIcon && <CrewmateIcon className="h-9 w-9 text-[#d8d8d8]" />}
        <p className="text-center text-[11px] font-bold uppercase leading-tight tracking-wide text-[#e8b23a]">
          {title}
        </p>
        {subtitle && (
          <p className="text-center text-[12px] font-bold uppercase leading-tight text-[#f2f2f2]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="hazard-stripe h-2.5 w-full" />
    </div>
  );
}
