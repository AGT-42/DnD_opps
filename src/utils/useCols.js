import { useState } from "react";

export const COL_CHOICES = [1, 2, 3, 4, 5];

// "Cards across" setting that is remembered per page (same idea as the combat page).
export function useCols(key, fallback = 3) {
  const [cols, setCols] = useState(() => {
    try {
      const n = Number(localStorage.getItem(key));
      return COL_CHOICES.includes(n) ? n : fallback;
    } catch {
      return fallback;
    }
  });

  const choose = (n) => {
    setCols(n);
    try {
      localStorage.setItem(key, String(n));
    } catch {
      /* storage unavailable: the choice just won't be remembered */
    }
  };

  return [cols, choose];
}
