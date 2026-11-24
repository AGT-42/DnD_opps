export const SIZES = ["Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan"];
export const TYPES = [
  "Aberration", "Beast", "Celestial", "Construct", "Dragon", "Elemental", "Fey",
  "Fiend", "Giant", "Humanoid", "Monstrosity", "Ooze", "Plant", "Undead",
];
export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

export const modifier = (score) => {
  const m = Math.floor((Number(score) - 10) / 2);
  return m >= 0 ? `+${m}` : `${m}`;
};

export const emptyMonster = {
  name: "",
  size: "Medium",
  type: "Beast",
  cr: "1",
  ac: 12,
  hp: 20,
  speed: "30 ft.",
  str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10,
  description: "",
  actions: "",
  spellSlots: [0, 0, 0, 0, 0, 0, 0, 0, 0], // slots per spell level, 1st to 9th
};