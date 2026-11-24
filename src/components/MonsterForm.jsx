import { useEffect, useState } from "react";
import { SIZES, TYPES, ABILITIES, emptyMonster } from "../utils/constants.js";
import { CR_LIST, scaleMonster } from "../utils/cr.js";
import { slotsFor, parseSpellcasting, ordinal } from "../utils/spells.js";
import { fetchSpellList } from "../services/dndApi.js";

const input = "w-full border border-line bg-white px-3 py-2 text-ink";
const NUMERIC = ["ac", "hp", ...ABILITIES];

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-mute">{label}</span>
      {children}
    </label>
  );
}

const spellLevelName = (level) => level === 0 ? "Cantrips" : `${ordinal(level)}-level spells`;

export default function MonsterForm({ initial = emptyMonster, onSubmit, submitLabel }) {
  const [form, setForm] = useState(() => ({ ...initial, spellSlots: slotsFor(initial) }));
  const [spellGroups, setSpellGroups] = useState(() => {
    const groups = Array.from({ length: 10 }, (_, level) => ({
      level,
      spells: parseSpellcasting(initial.description).find((group) => group.level === level)?.spells ?? [],
    }));
    return groups;
  });
  const [openLevel, setOpenLevel] = useState(null);
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

  const openSpellPicker = async (level) => {
    setOpenLevel(level);
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
      setLoadingLevel(null);
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

  const removeSpell = (spellName, level) => toggleSpell(spellName, level);
  useEffect(() => {
  const ordinaryDescription = (form.description || "")
    .split("\n")
    .filter((line) => !/^\s*(cantrips|\d(?:st|nd|rd|th)[ -]level)\s*\(/i.test(line))
    .join("\n")
    .trim();

  const spellLines = spellGroups
    .filter((group) => group.spells.length > 0)
    .map((group) => group.level === 0
      ? `Cantrips (at will): ${group.spells.join(", ")}`
      : `${ordinal(group.level)} level (${slots[group.level - 1] || 0} slots): ${group.spells.join(", ")}`);

  setForm((current) => ({
    ...current,
    description: [ordinaryDescription, ...spellLines].filter(Boolean).join("\n")
  }));
}, [spellGroups, form.spellSlots]);

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

    // Keep ordinary description text, then save the selected spells in the format SpellBook already reads.
    const ordinaryDescription = (form.description || "")
      .split("\n")
      .filter((line) => !/^\s*(cantrips|\d(?:st|nd|rd|th)[ -]level)\s*\(/i.test(line))
      .join("\n")
      .trim();
    const spellLines = spellGroups
      .filter((group) => group.spells.length > 0)
      .map((group) => group.level === 0
        ? `Cantrips (at will): ${group.spells.join(", ")}`
        : `${ordinal(group.level)} level (${data.spellSlots[group.level - 1] || 0} slots): ${group.spells.join(", ")}`);
    data.description = [ordinaryDescription, ...spellLines].filter(Boolean).join("\n");
    onSubmit(data);
  };

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

      <fieldset className="space-y-3">
        <legend className="mb-1 block text-sm text-mute">Spell slots and spells</legend>

        {/* Cantrips do not use spell slots, so keep their picker in a small separate row. */}
        {spellGroups[0] && (
          <div className="flex flex-wrap items-start gap-2">
            <div className="min-w-36">
              <p className="mb-1 text-center text-xs text-mute">Cantrips</p>
              <button
                type="button"
                onClick={() => openLevel === 0 ? setOpenLevel(null) : openSpellPicker(0)}
                className="w-full border border-blood px-2 py-1.5 text-xs font-semibold text-blood hover:bg-blood hover:text-white"
              >
                {openLevel === 0 ? "Close list" : "+ Add Spell"}
              </button>
              {spellGroups[0].spells.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {spellGroups[0].spells.map((spell) => (
                    <span key={spell} className="inline-flex items-center gap-1 border border-line bg-paper px-1.5 py-1 text-xs text-ink">
                      {spell}
                      <button type="button" onClick={() => removeSpell(spell, 0)} aria-label={`Remove ${spell}`} className="font-bold text-blood">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {openLevel === 0 && (
              <div className="min-w-48 flex-1 space-y-1">
                <input type="search" value={spellSearch} onChange={(e) => setSpellSearch(e.target.value)} placeholder="Search cantrips..." className={`${input} py-1 text-sm`} />
                {loadingLevel === 0 && <p className="text-xs text-mute">Loading spells...</p>}
                {spellError && <p className="text-xs text-blood">{spellError}</p>}
                {!loadingLevel && !spellError && (spellLists[0] ?? []).filter((spell) => spell.name.toLowerCase().includes(spellSearch.toLowerCase())).map((spell) => {
                  const selected = spellGroups[0].spells.includes(spell.name);
                  return <button type="button" key={spell.index} onClick={() => toggleSpell(spell.name, 0)} className={`flex w-full justify-between border px-2 py-1 text-left text-xs ${selected ? "border-blood bg-paper text-blood" : "border-line text-ink hover:border-blood"}`}><span>{spell.name}</span><span>{selected ? "✓" : "+ Add"}</span></button>;
                })}
              </div>
            )}
          </div>
        )}

        {/* Keep all nine spell-slot controls compact and side-by-side. The Add Spell
            button appears directly below a level only when that level has slots. */}
        <div
  className="grid gap-x-2 gap-y-3"
  style={{ gridTemplateColumns: "repeat(9, minmax(0, 1fr))" }}
>
          {spellGroups.filter((group) => group.level > 0).map((group) => {
            const level = group.level;
            const isOpen = openLevel === level;
            const hasSlots = Number(slots[level - 1]) > 0;
            const availableSpells = (spellLists[level] ?? []).filter((spell) => spell.name.toLowerCase().includes(spellSearch.toLowerCase()));
            return (
              <div key={level} className="min-w-0">
                <label className="block">
                  <span className="mb-1 block text-center text-xs text-mute">Lv {level}</span>
                  <input type="number" min="0" max="9" value={slots[level - 1]} onChange={(e) => setSlot(level - 1, e.target.value)} className={`${input} px-1 py-2 text-center`} />
                </label>
                {hasSlots && (
                  <button
                    type="button"
                    onClick={() => isOpen ? setOpenLevel(null) : openSpellPicker(level)}
                    className="mt-1 w-full border border-blood px-1 py-1 text-xs font-semibold text-blood hover:bg-blood hover:text-white"
                  >
                    {isOpen ? "Close" : "+ Add Spell"}
                  </button>
                )}
                {group.spells.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {group.spells.map((spell) => (
                      <span key={spell} className="inline-flex max-w-full items-center gap-1 border border-line bg-paper px-1 py-0.5 text-[11px] text-ink">
                        <span className="break-words">{spell}</span>
                        <button type="button" onClick={() => removeSpell(spell, level)} aria-label={`Remove ${spell}`} className="shrink-0 font-bold text-blood">×</button>
                      </span>
                    ))}
                  </div>
                )}
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    <input type="search" value={spellSearch} onChange={(e) => setSpellSearch(e.target.value)} placeholder="Search..." className={`${input} px-1 py-1 text-xs`} />
                    {loadingLevel === level && <p className="text-[11px] text-mute">Loading...</p>}
                    {spellError && <p className="text-[11px] text-blood">{spellError}</p>}
                    {!loadingLevel && !spellError && (
                      <div className="max-h-40 overflow-y-auto border border-line bg-white">
                        {availableSpells.map((spell) => {
                          const selected = group.spells.includes(spell.name);
                          return <button type="button" key={spell.index} onClick={() => toggleSpell(spell.name, level)} className={`flex w-full justify-between gap-1 border-b border-line px-1 py-1 text-left text-[11px] ${selected ? "bg-paper text-blood" : "text-ink hover:bg-paper"}`}><span>{spell.name}</span><span>{selected ? "✓" : "+"}</span></button>;
                        })}
                        {availableSpells.length === 0 && <p className="p-1 text-[11px] text-mute">No spells found.</p>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <Field label="Description">
        <textarea name="description" rows="3" value={form.description} onChange={set} className={input} />
      </Field>
      <Field label="Actions (one per line)">
        <textarea name="actions" rows="4" value={form.actions} onChange={set} className={input} />
      </Field>

      <button className=" bg-blood text-white px-5 py-2 text-lg font-bold hover:brightness-110">{submitLabel}</button>
    </form>
  );
}
