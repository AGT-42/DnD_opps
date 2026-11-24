import { useState } from "react";
import { getUsed, setUsed } from "../services/slotStore.js";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const whiteFocus = { outlineColor: "#fff" }; // default focus ring is red, invisible on the red column
const ordinal = (n) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[n] ?? `${n}th`);

// Click a filled diamond to spend that slot, click an empty one to get it back.
// `slots` is an array of 9 numbers: how many slots the monster has at levels 1-9.
export default function SpellSlotTracker({ scope, monsterId, slots }) {
  const max = Array.from({ length: 9 }, (_, i) => Math.max(0, Number(slots?.[i]) || 0));
  const [used, setUsedState] = useState(() => {
    const saved = getUsed(scope, monsterId);
    return max.map((m, i) => Math.min(Number(saved[i]) || 0, m)); // never more used than the max
  });

  if (max.every((n) => n === 0)) return null; // monster has no spell slots, show nothing

  const update = (next) => {
    setUsedState(next);
    setUsed(scope, monsterId, next);
  };

  const toggle = (level, pip) => {
    const next = [...used];
    // pips 0..(max-used-1) are still available; the rest are spent
    next[level] = pip < max[level] - used[level] ? used[level] + 1 : used[level] - 1;
    update(next);
  };

  return (
    <div className="mt-5 border-t border-white/30 pt-5 text-center">
      <p className={`${label} text-white/75`}>Spell slots</p>

      <ul className="mt-3 space-y-2">
        {max.map((total, level) =>
          total === 0 ? null : (
            <li key={level} className="flex items-center justify-center gap-3">
              <span className={`w-10 text-right ${label} text-white/75`}>{ordinal(level + 1)}</span>
              <div className="flex flex-wrap justify-center gap-2">
                {Array.from({ length: total }, (_, pip) => {
                  const available = pip < total - used[level];
                  return (
                    <button
                      key={pip}
                      type="button"
                      onClick={() => toggle(level, pip)}
                      aria-pressed={!available}
                      aria-label={`${ordinal(level + 1)} level slot ${pip + 1}, ${available ? "available" : "used"}`}
                      style={whiteFocus}
                      className={`h-4 w-4 rotate-45 border border-white ${available ? "bg-white" : "bg-transparent"}`}
                    />
                  );
                })}
              </div>
              <span className="w-10 text-left text-sm text-white/75">{total - used[level]}/{total}</span>
            </li>
          )
        )}
      </ul>

      <button
        type="button"
        onClick={() => update(max.map(() => 0))}
        style={whiteFocus}
        className={`mt-3 text-white/75 underline underline-offset-4 hover:text-white ${label}`}
      >
        Restore all slots
      </button>
    </div>
  );
}
