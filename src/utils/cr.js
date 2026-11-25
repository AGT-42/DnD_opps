// Challenge-rating scaling, based on the DMG "Monster Statistics by Challenge Rating" table.
// Row: [CR, proficiency bonus, AC, HP min, HP max, attack bonus, damage/round min, max, save DC]
const ROWS = [
  ["0", 2, 13, 1, 6, 3, 0, 1, 13],
  ["1/8", 2, 13, 7, 35, 3, 2, 3, 13],
  ["1/4", 2, 13, 36, 49, 3, 4, 5, 13],
  ["1/2", 2, 13, 50, 70, 3, 6, 8, 13],
  ["1", 2, 13, 71, 85, 3, 9, 14, 13],
  ["2", 2, 13, 86, 100, 3, 15, 20, 13],
  ["3", 2, 13, 101, 115, 4, 21, 26, 13],
  ["4", 2, 14, 116, 130, 5, 27, 32, 14],
  ["5", 3, 15, 131, 145, 6, 33, 38, 15],
  ["6", 3, 15, 146, 160, 6, 39, 44, 15],
  ["7", 3, 15, 161, 175, 6, 45, 50, 15],
  ["8", 3, 16, 176, 190, 7, 51, 56, 16],
  ["9", 4, 16, 191, 205, 7, 57, 62, 16],
  ["10", 4, 17, 206, 220, 7, 63, 68, 16],
  ["11", 4, 17, 221, 235, 8, 69, 74, 17],
  ["12", 4, 17, 236, 250, 8, 75, 80, 17],
  ["13", 5, 18, 251, 265, 8, 81, 86, 18],
  ["14", 5, 18, 266, 280, 8, 87, 92, 18],
  ["15", 5, 18, 281, 295, 8, 93, 98, 18],
  ["16", 5, 18, 296, 310, 9, 99, 104, 18],
  ["17", 6, 19, 311, 325, 10, 105, 110, 19],
  ["18", 6, 19, 326, 340, 10, 111, 116, 19],
  ["19", 6, 19, 341, 355, 10, 117, 122, 19],
  ["20", 6, 19, 356, 400, 10, 123, 140, 19],
  ["21", 7, 19, 401, 445, 11, 141, 158, 20],
  ["22", 7, 19, 446, 490, 11, 159, 176, 20],
  ["23", 7, 19, 491, 535, 11, 177, 194, 20],
  ["24", 7, 19, 536, 580, 12, 195, 212, 21],
  ["25", 8, 19, 581, 625, 12, 213, 230, 21],
  ["26", 8, 19, 626, 670, 12, 231, 248, 21],
  ["27", 8, 19, 671, 715, 13, 249, 266, 22],
  ["28", 8, 19, 716, 760, 13, 267, 284, 22],
  ["29", 9, 19, 761, 805, 13, 285, 302, 22],
  ["30", 9, 19, 806, 850, 14, 303, 320, 23],
];

export const CR_LIST = ROWS.map((r) => r[0]);

const TABLE = Object.fromEntries(
  ROWS.map(([cr, prof, ac, hpMin, hpMax, atk, dMin, dMax, dc]) => [
    cr,
    { prof, ac, hp: (hpMin + hpMax) / 2, atk, dpr: Math.max(0.5, (dMin + dMax) / 2), dc },
  ])
);

const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Returns a copy of `m` re-statted for `newCr`: AC, HP, STR/DEX/CON, to-hit bonuses, save DCs and damage.
export function scaleMonster(m, newCr) {
  const from = TABLE[m.cr];
  const to = TABLE[newCr];
  if (!from || !to || m.cr === newCr) return { ...m, cr: newCr };

  const atkDelta = to.atk - from.atk;
  const dcDelta = to.dc - from.dc;
  // Attack bonus = proficiency + ability modifier, so this is how far the ability modifier moves.
  const modDelta = to.atk - to.prof - (from.atk - from.prof);
  const dmgRatio = to.dpr / from.dpr;

  const rewrite = (text = "") =>
    text
      .replace(/(\d+) \((\d+)d(\d+)(?:\s*([+-])\s*(\d+))?\)/g, (_, avg, n, d, sign, mod) => {
        const dieAvg = (Number(d) + 1) / 2;
        const oldMod = sign ? (sign === "-" ? -1 : 1) * Number(mod) : 0;
        const newMod = oldMod + modDelta;
        const dice = Math.max(1, Math.round((Number(avg) * dmgRatio - newMod) / dieAvg));
        const average = Math.max(1, Math.floor(dice * dieAvg + newMod));
        return `${average} (${dice}d${d}${newMod ? (newMod > 0 ? "+" : "-") + Math.abs(newMod) : ""})`;
      })
      .replace(/([+-]\d+)( to hit)/g, (_, n, t) => `${signed(Number(n) + atkDelta)}${t}`)
      .replace(/\bDC (\d+)/g, (_, n) => `DC ${Math.max(1, Number(n) + dcDelta)}`);

  const out = {
    ...m,
    cr: newCr,
    ac: Math.max(1, Number(m.ac) + (to.ac - from.ac)),
    hp: Math.max(1, Math.round((Number(m.hp) * to.hp) / from.hp)),
    description: rewrite(m.description),
    actions: rewrite(m.actions),
    bonusActions: rewrite(m.bonusActions),
  };
  for (const k of ["str", "dex", "con"]) out[k] = clamp(Number(m[k]) + 2 * modDelta, 1, 30);
  return out;
}
