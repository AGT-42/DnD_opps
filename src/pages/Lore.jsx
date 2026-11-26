import { useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field.jsx";
import GroupBoard from "../components/GroupBoard.jsx";
import { loreStore } from "../services/loreStore.js";
import { npcStore } from "../services/npcStore.js";
import { campaignStore } from "../services/campaignStore.js";
import { input, label, btnPrimary, btnOutline, btnSmall } from "../utils/ui.js";

const KINDS = ["City", "Town", "Village", "Region", "Dungeon", "Fortress", "Landmark", "Tavern", "Diety", "Historical figure","Organization","Other"];
const blank = { name: "", kind: "City", region: "", ruler: "", campaignId: "", description: "", history: "", secrets: "", groupId: "" };

export default function Lore() {
  const npcs = npcStore.all();
  const campaigns = campaignStore.all();
  const campaignById = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const [rows, setRows] = useState(loreStore.all);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [addingFolder, setAddingFolder] = useState(false);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("");

  const refresh = () => setRows(loreStore.all());
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(blank);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, name: form.name.trim() };
    if (editingId) loreStore.update(editingId, data);
    else loreStore.create(data);
    refresh();
    closeForm();
  };

  const startEdit = (place) => {
    setEditingId(place.id);
    setForm({ ...blank, ...place });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (place) => {
    if (!window.confirm(`Delete ${place.name}?`)) return;
    loreStore.remove(place.id);
    refresh();
    if (editingId === place.id) closeForm();
  };

  const q = query.toLowerCase();
  // No alphabetical sort any more: cards stay in the order you drag them into.
  const shown = rows.filter((p) => (!kind || p.kind === kind) && [p.name, p.region, p.ruler, p.description, p.history].some((v) => (v ?? "").toLowerCase().includes(q)));

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">Lore</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search places and notes" className="border border-line bg-white px-3 py-2" />
          <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type" className="border border-line bg-white px-3 py-2">
            <option value="">All types</option>
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
          <button onClick={() => setAddingFolder(true)} className={btnOutline}>+ New folder</button>
          {!formOpen && <button onClick={() => setFormOpen(true)} className={btnPrimary}>Add Lore</button>}
        </div>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mb-8 max-w-3xl space-y-4 border border-line bg-white p-5">
          <h2 className="font-display text-2xl">{editingId ? `Edit ${form.name || "place"}` : "New place"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name"><input name="name" value={form.name} onChange={set} required className={input} /></Field>
            <Field label="Type">
              <select name="kind" value={form.kind} onChange={set} className={input}>
                {KINDS.map((k) => <option key={k}>{k}</option>)}
              </select>
            </Field>
            <Field label="Region / realm"><input name="region" value={form.region} onChange={set} className={input} /></Field>
            <Field label="Ruler / leader"><input name="ruler" value={form.ruler} onChange={set} className={input} /></Field>
            <Field label="Campaign" className="sm:col-span-2">
              <select name="campaignId" value={form.campaignId ?? ""} onChange={set} className={input}>
                <option value="">No campaign</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description (what the party sees)">
            <textarea name="description" rows="3" value={form.description} onChange={set} className={input} />
          </Field>
          <Field label="History / lore">
            <textarea name="history" rows="4" value={form.history} onChange={set} className={input} />
          </Field>
          <Field label="Secrets and plot hooks (DM only)">
            <textarea name="secrets" rows="3" value={form.secrets} onChange={set} className={input} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary}>{editingId ? "Save changes" : "Add place"}</button>
            <button type="button" onClick={closeForm} className={btnOutline}>Cancel</button>
          </div>
        </form>
      )}

      <GroupBoard
        adding={addingFolder}
        onAddingChange={setAddingFolder}
        groupKey="mb:groups:lore"
        rows={rows}
        shown={shown}
        filtering={!!(query || kind)}
        emptyText={rows.length === 0 ? "No places yet. Add your first city or location with the button above." : "No places match that search."}
        onRowsChange={(next) => {
          loreStore.replaceAll(next);
          refresh();
        }}
      >
        {(p, ui) => {
          // NPCs whose "Location" matches this place's name
          const residents = p.name ? npcs.filter((n) => (n.location ?? "").trim().toLowerCase() === p.name.trim().toLowerCase()) : [];
          const campaign = campaignById[p.campaignId];
          const sub = [p.region, p.ruler && `Ruled by ${p.ruler}`].filter(Boolean).join(" · ");
          return (
            <article {...ui.articleProps} className={`flex flex-col border bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] ${ui.stateClass}`}>
              {ui.grip}
              <header className="bg-blood px-5 py-4 text-white">
                <p className={`${label} text-white/75`}>{p.kind}{campaign ? ` · ${campaign.name}` : ""}</p>
                <h2 className="font-display text-3xl leading-tight">{p.name}</h2>
                {sub && <p className="text-white/85">{sub}</p>}
              </header>

              <div className="flex-1 space-y-4 px-5 py-4 text-sm leading-relaxed text-mute">
                {p.description && <p className="whitespace-pre-line text-ink">{p.description}</p>}
                {p.history && (
                  <div>
                    <p className={`${label} text-blood`}>History</p>
                    <p className="mt-1 whitespace-pre-line">{p.history}</p>
                  </div>
                )}
                {p.secrets && (
                  <div>
                    <p className={`${label} text-blood`}>Secrets (DM only)</p>
                    <p className="mt-1 whitespace-pre-line">{p.secrets}</p>
                  </div>
                )}
                {residents.length > 0 && (
                  <div>
                    <p className={`${label} text-blood`}>People here</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {residents.map((n) => (
                        <Link key={n.id} to="/npcs" className="border border-line bg-paper px-2 py-1 text-xs text-ink hover:border-blood hover:text-blood">
                          {n.name}{n.role ? ` · ${n.role}` : ""}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <footer className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
                <button onClick={() => startEdit(p)} className={btnSmall}>Edit</button>
                {ui.groupPicker}
                <button onClick={() => handleDelete(p)} className={`ml-auto text-blood hover:underline ${label}`}>Delete</button>
              </footer>
            </article>
          );
        }}
      </GroupBoard>
    </section>
  );
}
