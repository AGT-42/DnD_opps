import { useEffect, useState } from "react";
import { getUsed, setUsed, subscribe } from "./slotStore.js";

const toMax = (slots) => Array.from({ length: 9 }, (_, i) => Math.max(0, Number(slots?.[i]) || 0));

// Shared slot state for one monster. Every component that calls this with the same
// scope + monsterId updates together. `level` below is 0-based (0 = 1st-level slots).
export function useSpellSlots(scope, monsterId, slots) {
  const max = toMax(slots);
  const [saved, setSaved] = useState(() => getUsed(scope, monsterId));

  useEffect(() => subscribe(() => setSaved(getUsed(scope, monsterId))), [scope, monsterId]);

  const clamp = (list) => max.map((m, i) => Math.min(Number(list[i]) || 0, m)); // never more used than max
  const used = clamp(saved);

  const write = (next) => setUsed(scope, monsterId, next);

  return {
    max,
    used,
    spend: (level) => {
      const now = clamp(getUsed(scope, monsterId));
      if (now[level] >= max[level]) return false;
      now[level] += 1;
      write(now);
      return true;
    },
    restore: (level) => {
      const now = clamp(getUsed(scope, monsterId));
      now[level] = Math.max(0, now[level] - 1);
      write(now);
    },
    reset: () => write(max.map(() => 0)),
  };
}
