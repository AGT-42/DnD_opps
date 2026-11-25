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

// ---- Roll helper: the numbers the DM needs when a monster casts a spell ----
const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);
const abilityMod = (score) => Math.floor(((Number(score) || 10) - 10) / 2);
const ABILITY_KEYS = { strength: "str", dexterity: "dex", constitution: "con", intelligence: "int", wisdom: "wis", charisma: "cha" };

// Proficiency bonus from challenge rating (CR 0-4 = +2, 5-8 = +3, 9-12 = +4, ...).
const profFromCr = (cr) => {
  const [a, b] = String(cr).split("/");
  const n = b ? Number(a) / Number(b) : Number(a);
  return n >= 1 ? 2 + Math.floor((n - 1) / 4) : 2;
};

// The monster's spellcasting numbers. Reads them from its description when written there
// ("spell save DC 14, +6 to hit with spell attacks"); otherwise works them out from CR and ability scores.
export function casterStats(m) {
  const text = m.description ?? "";
  const named = text.match(/spellcasting ability is (\w+)/i)?.[1]?.toLowerCase();
  const key = ABILITY_KEYS[named] ?? ["int", "wis", "cha"].reduce((best, k) => ((Number(m[k]) || 10) > (Number(m[best]) || 10) ? k : best), "int");
  const mod = abilityMod(m[key]);
  const prof = profFromCr(m.cr);
  const dc = Number(text.match(/spell save DC\s*(\d+)/i)?.[1]) || 8 + prof + mod;
  const attack = Number(text.match(/([+-]\d+)\s*to hit with spell attacks/i)?.[1]) || prof + mod;
  const casterLevel = Number(text.match(/(\d+)(?:st|nd|rd|th)-level spellcaster/i)?.[1]) || Math.max(1, Math.round(Number(String(m.cr).includes("/") ? 0 : m.cr) || 1));
  return { dc, attack, mod, casterLevel, ability: key.toUpperCase() };
}

// Picks the entry for `level` from an API table like { "3": "8d6", "4": "9d6" }:
// the exact level, else the highest one at or below it, else the lowest.
const pickAt = (table, level) => {
  if (!table) return null;
  const keys = Object.keys(table).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return null;
  const key = keys.filter((k) => k <= level).pop() ?? keys[0];
  return table[String(key)];
};

const MULTI = { "magic-missile": ["dart", (l) => l + 2], "scorching-ray": ["ray", (l) => l + 1] }; // spells that fire several separate hits

// What to roll for `spell` when cast at `level` by monster `m`. Returns null if the spell has nothing to roll.
// { attack, save: { dc, ability, onSuccess }, damage, heal, area }
export function spellRolls(spell, level, m) {
  if (!spell) return null;
  const c = casterStats(m);
  const out = {};

  if (spell.attack_type) out.attack = signed(c.attack);
  if (spell.dc) {
    const success = spell.dc.dc_success;
    out.save = {
      dc: c.dc,
      ability: spell.dc.dc_type?.name ?? "",
      onSuccess: success === "half" ? "half damage on a success" : success === "none" ? "no effect on a success" : "",
    };
  }

  const dmg = spell.damage;
  const dice = pickAt(dmg?.damage_at_slot_level, level) ?? pickAt(dmg?.damage_at_character_level, c.casterLevel);
  if (dice) {
    const type = dmg.damage_type?.name?.toLowerCase() ?? "";
    const multi = MULTI[spell.index];
    out.damage = multi
      ? `${multi[1](level)} ${multi[0]}s, each ${dice} ${type}`.trim()
      : `${dice} ${type}`.trim();
  }

  const heal = pickAt(spell.heal_at_slot_level, level);
  if (heal) out.heal = heal.replace(/\s*\+\s*MOD/i, c.mod >= 0 ? ` + ${c.mod}` : ` - ${-c.mod}`);

  const area = spell.area_of_effect;
  if (area) out.area = `${area.size} ft ${area.type}`;

  return out.attack || out.save || out.damage || out.heal ? out : null;
}
