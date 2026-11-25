// Talks to the free D&D 5e SRD API (no key needed) and converts
// its monsters into the shape our app stores.
import { TYPES } from "../utils/constants.js";
import { slotsFromText } from "../utils/spells.js";

const BASE = "https://www.dnd5eapi.co/api/2014";

const getJson = async (path) => {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
};

export const fetchMonsterList = async () => (await getJson("/monsters")).results;
export const fetchMonster = (index) => getJson(`/monsters/${index}`);
export const fetchSpell = (index) => getJson(`/spells/${index}`);
export const fetchSpellList = async (level) => (await getJson(`/spells?level=${level}`)).results;

const CR_FRACTIONS = { 0.125: "1/8", 0.25: "1/4", 0.5: "1/2" };

const formatSpeed = (speed = {}) =>
  Object.entries(speed)
    .map(([mode, value]) => (mode === "walk" ? value : `${mode} ${value}`))
    .join(", ") || "30 ft.";

const joinEntries = (list = []) => list.map((e) => `${e.name}. ${e.desc}`).join("\n");

// Spell slots: use the API's numbers if it gives them, otherwise read "1st level (4 slots)" lines.
const slotsFromApi = (api, description) => {
  const slots = api.special_abilities?.find((a) => a.spellcasting)?.spellcasting?.slots;
  const fromApi = Array.from({ length: 9 }, (_, i) => Number(slots?.[i + 1]) || 0);
  return fromApi.some((n) => n > 0) ? fromApi : slotsFromText(description);
};

export const toLocalMonster = (api) => ({
  name: api.name,
  size: api.size,
  type: TYPES.find((t) => api.type.toLowerCase().includes(t.toLowerCase())) ?? "Humanoid",
  cr: CR_FRACTIONS[api.challenge_rating] ?? String(api.challenge_rating),
  ac: Array.isArray(api.armor_class) ? api.armor_class[0]?.value ?? 10 : api.armor_class ?? 10,
  hp: api.hit_points,
  speed: formatSpeed(api.speed),
  str: api.strength,
  dex: api.dexterity,
  con: api.constitution,
  int: api.intelligence,
  wis: api.wisdom,
  cha: api.charisma,
  description: joinEntries(api.special_abilities),
  actions: joinEntries(api.actions),
  bonusActions: "", // the SRD data has no separate bonus-action list
  spellSlots: slotsFromApi(api, joinEntries(api.special_abilities)),
});
