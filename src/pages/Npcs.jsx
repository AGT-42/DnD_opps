import { useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field.jsx";
import { npcStore } from "../services/npcStore.js";
import { monsterStore } from "../services/monsterStore.js";
import { playerStore } from "../services/playerStore.js";
import { ATTITUDES } from "../utils/constants.js";
import { input, label, btnPrimary, btnOutline, btnSmall } from "../utils/ui.js";

const blank = { name: "", race: "", role: "", location: "", attitude: "Neutral", monsterId: "", notes: "" };

const attitudeStyle = (a) =>
  a === "Hostile" ? "bg-blood text-white"
  : a === "Ally" || a === "Friendly" ? "bg-ink text-paper"
  : "border border-line text-mute";

export default function Npcs() {
  const monsters = monsterStore.all();
  const players = playerStore.all();
  const [rows, setRows] = useState(npcStore.all);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [attitude, setAttitude] = useState("");

  const refresh = () => setRows(npcStore.all());
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(blank);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, name: form.name.trim() };
    if (editingId) npcStore.update(editingId, data);
    else npcStore.create(data);
    refresh();
    closeForm();
  };

  const startEdit = (n) => {
    setEditingId(n.id);
    setForm({ ...blank, ...n });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (n) => {
    if (!window.confirm(`Delete ${n.name}? Players affiliated with them will lose that link.`)) return;
    npcStore.remove(n.id);
    playerStore.forgetNpc(n.id);
    refresh();
    if (editingId === n.id) closeForm();
  };

  const q = query.toLowerCase();
  const shown = rows.filter(
    (n) =>
      (!attitude || n.attitude === attitude) &&
      [n.name, n.race, n.role, n.location].some((v) => (v ?? "").toLowerCase().includes(q))
  );

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">NPCs</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, role, place" className="border border-line bg-white px-3 py-2" />
          <select value={attitude} onChange={(e) => setAttitude(e.target.value)} aria-label="Filter by attitude" className="border border-line bg-white px-3 py-2">
            <option value="">All attitudes</option>
            {ATTITUDES.map((a) => <option key={a}>{a}</option>)}
          </select>
          {!formOpen && <button onClick={() => setFormOpen(true)} className={btnPrimary}>Add NPC</button>}
        </div>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mb-8 max-w-3xl space-y-4 border border-line bg-white p-5">
          <h2 className="font-display text-2xl">{editingId ? `Edit ${form.name || "NPC"}` : "New NPC"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input name="name" value={form.name} onChange={set} required className={input} /></Field>
            <Field label="Role (innkeeper, spy, mayor...)"><input name="role" value={form.role} onChange={set} className={input} /></Field>
            <Field label="Race"><input name="race" value={form.race} onChange={set} className={input} /></Field>
            <Field label="Location"><input name="location" value={form.location} onChange={set} className={input} /></Field>
            <Field label="Attitude toward the party">
              <select name="attitude" value={form.attitude} onChange={set} className={input}>
                {ATTITUDES.map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Stat block (optional)">
              <select name="monsterId" value={form.monsterId} onChange={set} className={input}>
                <option value="">None</option>
                {monsters.map((m) => <option key={m.id} value={m.id}>{m.name} (CR {m.cr})</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea name="notes" rows="4" value={form.notes} onChange={set} className={input} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary}>{editingId ? "Save changes" : "Add NPC"}</button>
            <button type="button" onClick={closeForm} className={btnOutline}>Cancel</button>
          </div>
        </form>
      )}

      {shown.length === 0 ? (
        <p className="text-mute">
          {rows.length === 0 ? "No NPCs yet. Add the first one with the button above." : "No NPCs match that search."}
        </p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((n) => {
            const monster = n.monsterId ? monsterStore.get(n.monsterId) : null;
            const linked = players
              .map((p) => ({ p, a: p.affiliations.find((x) => x.npcId === n.id) }))
              .filter((x) => x.a);
            const sub = [n.race, n.role].filter(Boolean).join(" · ");
            return (
              <article key={n.id} className="flex flex-col border border-line bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]">
                <header className="flex items-start justify-between gap-3 px-5 pb-3 pt-5">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl leading-tight text-ink">{n.name}</h2>
                    {sub && <p className="text-blood">{sub}</p>}
                  </div>
                  <span className={`shrink-0 px-2 py-1 ${label} ${attitudeStyle(n.attitude)}`}>{n.attitude}</span>
                </header>

                <div className="flex-1 space-y-3 px-5 pb-4 text-sm leading-relaxed text-mute">
                  {n.location && <p><span className="text-ink">Found in:</span> {n.location}</p>}
                  {n.notes && <p className="whitespace-pre-line">{n.notes}</p>}
                  {monster && (
                    <p>
                      <span className="text-ink">Stat block:</span>{" "}
                      <Link to={`/monsters/${monster.id}`} className="text-blood underline underline-offset-2">{monster.name}</Link>
                    </p>
                  )}
                  {linked.length > 0 && (
                    <div>
                      <p className={`${label} text-blood`}>Affiliated players</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {linked.map(({ p, a }) => (
                          <span key={p.id} className="border border-line bg-paper px-2 py-1 text-xs text-ink">{p.name} · {a.relation}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <footer className="flex items-center gap-3 border-t border-line px-5 py-3">
                  <button onClick={() => startEdit(n)} className={btnSmall}>Edit</button>
                  <button onClick={() => handleDelete(n)} className={`ml-auto text-blood hover:underline ${label}`}>Delete</button>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}