import clsx from "clsx";
import { Check } from "lucide-react";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div
              className={clsx(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                i < current ? "bg-brand-600 text-white" : i === current ? "bg-brand-100 text-brand-700 ring-2 ring-brand-600" : "bg-ink-100 text-ink-400"
              )}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={clsx("hidden text-xs sm:block", i === current ? "font-semibold text-ink-800" : "text-ink-400")}>{label}</span>
          </div>
          {i < steps.length - 1 && <div className={clsx("mx-2 h-0.5 flex-1", i < current ? "bg-brand-600" : "bg-ink-100")} />}
        </div>
      ))}
    </div>
  );
}
