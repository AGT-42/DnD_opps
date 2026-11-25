import { useState } from "react";
import { SIZES, TYPES, ABILITIES, emptyMonster } from "../utils/constants.js";
import { CR_LIST, scaleMonster } from "../utils/cr.js";
import { slotsFor, parseSpellcasting, ordinal } from "../utils/spells.js";
import { fetchSpellList } from "../services/dndApi.js";

const input = "w-full border border-line bg-white px-3 py-2 text-ink";
const NUMERIC = ["ac", "hp", ...ABILITIES];

// Spell lines ("Cantrips (at will): ...", "1st level (4 slots): ...") are managed by the spell picker,
// so they are kept out of the description box and added back when the monster is saved.
const SPELL_LINE = /^\s*(cantrips|\d(?:st|nd|rd|th)[ -]level)\s*\(/i;
const withoutSpellLines = (text = "") =>
  text.split("\n").filter((line) => !SPELL_LINE.test(line)).join("\n").trim();

const spellLines = (groups, slots) =>
  groups
    .filter((g) => g.spells.length > 0)
    .map((g) =>
      g.level === 0
        ? `Cantrips (at will): ${g.spells.join(", ")}`
        : `${ordinal(g.level)} level (${slots[g.level - 1] || 0} slots): ${g.spells.join(", ")}`
    );

const levelName = (level) => (level === 0 ? "Cantrips" : ordinal(level));
const noSpinner = "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-mute">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-mute">{hint}</span>}
    </label>
  );
}

export default function MonsterForm({ initial = emptyMonster, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => ({
    ...initial,
    bonusActions: initial.bonusActions ?? "",
    description: withoutSpellLines(initial.description),
    spellSlots: slotsFor(initial),
  }));
  // One entry per spell level; index === level (0 = cantrips).
  const [spellGroups, setSpellGroups] = useState(() => {
    const parsed = parseSpellcasting(initial.description);
    return Array.from({ length: 10 }, (_, level) => ({
      level,
      spells: parsed.find((group) => group.level === level)?.spells ?? [],
    }));
  });
  const [activeLevel, setActiveLevel] = useState(null);
  const [spellSearch, setSpellSearch] = useState("");
  const [spellLists, setSpellLists] = useState({});
  const [loadingLevel, setLoadingLevel] = useState(null);
  const [spellError, setSpellError] = useState("");

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Spell slots: 9 numbers, one per spell level. Older monsters saved before this feature have none.
  const slots = form.spellSlots ?? Array(9).fill(0);
  const setSlot = (i, value) => {
    const next = [...slots];
    next[i] = value;
    setForm({ ...form, spellSlots: next });
  };

  // Tabs: cantrips always, plus any level that has slots or already has spells chosen.
  const tabLevels = [0, ...Array.from({ length: 9 }, (_, i) => i + 1).filter(
    (level) => Number(slots[level - 1]) > 0 || spellGroups[level].spells.length > 0
  )];
  const open = tabLevels.includes(activeLevel) ? activeLevel : null;
  const hasLeveledTabs = tabLevels.length > 1;

  const selectLevel = async (level) => {
    if (open === level) {
      setActiveLevel(null);
      return;
    }
    setActiveLevel(level);
    setSpellSearch("");
    setSpellError("");
    if (spellLists[level]) return;
    setLoadingLevel(level);
    try {
      const spells = await fetchSpellList(level);
      setSpellLists((current) => ({ ...current, [level]: spells }));
    } catch {
      setSpellError("Couldn't load the spell list. Check your connection and try again.");
    } finally {
      setLoadingLevel((current) => (current === level ? null : current));
    }
  };

  const toggleSpell = (spellName, level) => {
    setSpellGroups((current) => current.map((group) => {
      if (group.level !== level) return group;
      const exists = group.spells.includes(spellName);
      return {
        ...group,
        spells: exists ? group.spells.filter((name) => name !== spellName) : [...group.spells, spellName],
      };
    }));
  };

  // Changing CR re-stats the monster (AC, HP, abilities, to-hit, DCs, damage). Tweak anything afterwards.
  const setCr = (e) => {
    const current = { ...form };
    NUMERIC.forEach((k) => (current[k] = Number(current[k]) || 0));
    setForm(scaleMonster(current, e.target.value));
  };
  const crOptions = CR_LIST.includes(form.cr) ? CR_LIST : [form.cr, ...CR_LIST];

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, name: form.name.trim() };
    NUMERIC.forEach((k) => (data[k] = Number(data[k]) || 0));
    data.spellSlots = slots.map((n) => Math.max(0, Math.min(9, Number(n) || 0)));
    // Ordinary description text first, then the chosen spells in the format SpellBook reads.
    data.description = [withoutSpellLines(form.description), ...spellLines(spellGroups, data.spellSlots)]
      .filter(Boolean)
      .join("\n");
    onSubmit(data);
  };

  const chosen = spellGroups.filter((g) => g.spells.length > 0);
  const options = open === null
    ? []
    : (spellLists[open] ?? []).filter((spell) => spell.name.toLowerCase().includes(spellSearch.toLowerCase()));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Name">
        <input name="name" value={form.name} onChange={set} required className={input} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Size">
          <select name="size" value={form.size} onChange={set} className={input}>
            {SIZES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Type">
          <select name="type" value={form.type} onChange={set} className={input}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Challenge rating (rescales the stats)">
          <select name="cr" value={form.cr} onChange={setCr} className={input}>
            {crOptions.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Armor class">
          <input type="number" name="ac" min="0" value={form.ac} onChange={set} className={input} />
        </Field>
        <Field label="Hit points">
          <input type="number" name="hp" min="1" value={form.hp} onChange={set} className={input} />
        </Field>
        <Field label="Speed">
          <input name="speed" value={form.speed} onChange={set} className={input} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {ABILITIES.map((a) => (
          <Field key={a} label={a.toUpperCase()}>
            <input type="number" name={a} min="1" max="30" value={form[a]} onChange={set} className={input} />
          </Field>
        ))}
      </div>

      <fieldset className="max-w-3xl space-y-5">
        <legend className="mb-1 block text-sm text-mute">Spell slots and spells</legend>

        {/* 1. How many slots at each level */}
        <div>
          <p className="mb-1.5 text-xs text-mute">Spell slots per level</p>
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-9">
            {Array.from({ length: 9 }, (_, i) => (
              <label key={i} className="block">
                <span className="mb-1 block text-center text-xs text-mute">{ordinal(i + 1)}</span>
                <input
                  type="number"
                  min="0"
                  max="9"
                  value={slots[i]}
                  onChange={(e) => setSlot(i, e.target.value)}
                  aria-label={`${ordinal(i + 1)}-level spell slots`}
                  className={`${input} px-1 text-center ${noSpinner}`}
                />
              </label>
            ))}
          </div>
        </div>

        {/* 2. Pick a level, then add spells to it */}
        <div>
          <p className="mb-1.5 text-xs text-mute">Add spells (pick a level)</p>
          <div className="flex flex-wrap items-center gap-2">
            {tabLevels.map((level) => {
              const count = spellGroups[level].spells.length;
              const active = open === level;
              return (
                <button
                  key={level}
                  type="button"
                  aria-pressed={active}
                  onClick={() => selectLevel(level)}
                  className={`border px-3 py-1.5 text-xs font-semibold ${
                    active ? "border-ink bg-ink text-paper" : "border-line bg-white text-ink hover:border-blood hover:text-blood"
                  }`}
                >
                  {levelName(level)}
                  {count > 0 && <span className={`ml-1.5 ${active ? "text-paper/70" : "text-blood"}`}>{count}</span>}
                </button>
              );
            })}
            {!hasLeveledTabs && <span className="text-xs text-mute">Give it spell slots above to add leveled spells.</span>}
          </div>

          {open !== null && (
            <div className="mt-2 space-y-2 border border-line bg-paper p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">
                  {open === 0 ? "Cantrips (at will)" : `${ordinal(open)}-level spells`}
                </p>
                <button type="button" onClick={() => setActiveLevel(null)} className="text-xs font-semibold text-mute hover:text-ink">
                  Close
                </button>
              </div>
              <input
                type="search"
                value={spellSearch}
                onChange={(e) => setSpellSearch(e.target.value)}
                placeholder="Search spells..."
                className={`${input} max-w-xs py-1.5 text-sm`}
              />
              {loadingLevel === open && <p className="text-xs text-mute">Loading spells...</p>}
              {spellError && <p className="text-xs text-blood">{spellError}</p>}
              {loadingLevel !== open && !spellError && (
                <div className="grid max-h-56 gap-1 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {options.map((spell) => {
                    const selected = spellGroups[open].spells.includes(spell.name);
                    return (
                      <button
                        type="button"
                        key={spell.index}
                        aria-pressed={selected}
                        onClick={() => toggleSpell(spell.name, open)}
                        className={`flex items-center justify-between gap-2 border px-2 py-1.5 text-left text-xs ${
                          selected ? "border-blood bg-white text-blood" : "border-line bg-white text-ink hover:border-blood"
                        }`}
                      >
                        <span>{spell.name}</span>
                        <span className="shrink-0">{selected ? "✓" : "+"}</span>
                      </button>
                    );
                  })}
                  {options.length === 0 && <p className="text-xs text-mute">No spells found.</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. What's been chosen so far */}
        {chosen.length > 0 && (
          <div className="space-y-2 border-t border-line pt-4">
            <p className="text-xs text-mute">Chosen spells</p>
            {chosen.map((group) => (
              <div key={group.level} className="flex flex-wrap items-start gap-x-3 gap-y-1">
                <span className="w-16 shrink-0 pt-1 text-xs font-semibold text-ink">{levelName(group.level)}</span>
                <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                  {group.spells.map((spell) => (
                    <span key={spell} className="inline-flex items-center gap-1.5 border border-line bg-paper px-2 py-1 text-xs text-ink">
                      {spell}
                      <button
                        type="button"
                        onClick={() => toggleSpell(spell, group.level)}
                        aria-label={`Remove ${spell}`}
                        className="font-bold text-blood"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      <Field label="Description">
        <textarea name="description" rows="3" value={form.description} onChange={set} className={input} />
      </Field>
      <Field label="Actions (one per line)" hint="Write each as: Name. What it does.">
        <textarea name="actions" rows="4" value={form.actions} onChange={set} className={input} />
      </Field>
      <Field label="Bonus actions (one per line)" hint="Same format, e.g. Nimble Escape. Takes the Disengage or Hide action.">
        <textarea name="bonusActions" rows="3" value={form.bonusActions} onChange={set} className={input} />
      </Field>

      <button className=" bg-blood text-white px-5 py-2 text-lg font-bold hover:brightness-110">{submitLabel}</button>
    </form>
  );
}
