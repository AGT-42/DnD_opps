import { useState } from "react";
import { SIZES, TYPES, ABILITIES, emptyMonster } from "../utils/constants.js";
import { CR_LIST, scaleMonster } from "../utils/cr.js";

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

export default function MonsterForm({ initial = emptyMonster, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initial);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  // Spell slots: 9 numbers, one per spell level. Older monsters saved before this feature have none.
  const slots = form.spellSlots ?? Array(9).fill(0);
  const setSlot = (i, value) => {
    const next = [...slots];
    next[i] = value;
    setForm({ ...form, spellSlots: next });
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

      <fieldset>
        <legend className="mb-1 block text-sm text-mute">Spell slots per level (leave at 0 if it can't cast)</legend>
        <div className="grid grid-cols-5 gap-3 sm:grid-cols-9">
          {slots.map((n, i) => (
            <label key={i} className="block text-center">
              <span className="mb-1 block text-xs text-mute">Lv {i + 1}</span>
              <input type="number" min="0" max="9" value={n} onChange={(e) => setSlot(i, e.target.value)} className={`${input} px-2 text-center`} />
            </label>
          ))}
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
