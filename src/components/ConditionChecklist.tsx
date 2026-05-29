import type { ConditionCheck } from "@/lib/conditions/types";

type ConditionChecklistProps = {
  checks: ConditionCheck[];
};

export default function ConditionChecklist({ checks }: ConditionChecklistProps) {
  return (
    <ul className="space-y-2" role="list" aria-label="達成条件">
      {checks.map((check) => (
        <li
          className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
            check.ok
              ? "border-success/40 bg-success/10 text-success"
              : "border-border bg-bg text-textMuted"
          }`}
          key={check.id}
        >
          <span aria-hidden="true" className="mt-0.5 font-mono">
            {check.ok ? "✓" : check.kind === "state" ? "◇" : "○"}
          </span>
          <span className="min-w-0 flex-1">{check.label}</span>
        </li>
      ))}
    </ul>
  );
}
