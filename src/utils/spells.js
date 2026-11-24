// Helpers for reading spellcasting info out of a monster's description text.
// SRD monsters list spells like:
//   Cantrips (at will): fire bolt, light, mage hand
//   1st level (4 slots): detect magic, mage armor, magic missile

export const ordinal = (n) => ({ 1: "1st", 2: "2nd", 3: "3rd" }[n] ?? `${n}th`);

const LINE = /^\s*(cantrips|(\d)(?:st|nd|rd|th)[ -]level)\s*\((?:at will|(\d+)\s*slots?)\)\s*:\s*(.+)$/i;
// Same thing, but finds the groups anywhere in the text (even if several share one line).
const GROUP = /(cantrips|(\d)(?:st|nd|rd|th)[ -]level)\s*\((?:at will|(\d+)\s*slots?)\)\s*:\s*([^\n]+?)(?=\s*(?:cantrips|\d(?:st|nd|rd|th)[ -]level)\s*\(|\.\s|\n|$)/gi;

export const isSpellLine = (line) => LINE.test(line);

// Returns [{ level, slots, spells: ["fire bolt", ...] }]. Level 0 = cantrips.
export function parseSpellcasting(text = "") {
  return [...text.matchAll(GROUP)]
    .map((m) => ({
      level: m[1].toLowerCase() === "cantrips" ? 0 : Number(m[2]),
      slots: m[3] ? Number(m[3]) : 0,
      spells: m[4].split(",").map((s) => s.replace(/[*†]/g, "").trim()).filter(Boolean),
    }));
}

// 9 numbers: slots at levels 1-9, read from the description text.
export function slotsFromText(text = "") {
  const out = Array(9).fill(0);
  parseSpellcasting(text).forEach((g) => {
    if (g.level >= 1 && g.level <= 9) out[g.level - 1] = g.slots;
  });
  return out;
}

// The slots to use for a monster: the ones saved on it, or (for monsters saved before
// the tracker existed) the ones written in its description.
export const slotsFor = (m) =>
  Array.isArray(m.spellSlots) && m.spellSlots.some((n) => Number(n) > 0)
    ? m.spellSlots
    : slotsFromText(m.description);

// "Melf's acid arrow" -> "melfs-acid-arrow" (the API's spell id)
export const spellIndex = (name) =>
  name.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
