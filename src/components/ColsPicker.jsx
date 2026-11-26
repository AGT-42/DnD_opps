import { COL_CHOICES } from "../utils/useCols.js";
import { label } from "../utils/ui.js";

// The "Cards across" 1-5 button group, same look as the combat page.
export default function ColsPicker({ cols, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`${label} text-mute`}>Cards across</span>
      <div role="group" aria-label="Cards across" className="flex border border-ink">
        {COL_CHOICES.map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={cols === n}
            onClick={() => onChange(n)}
            className={`w-9 py-2 ${label} ${cols === n ? "bg-ink text-paper" : "hover:bg-ink/10"}`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
