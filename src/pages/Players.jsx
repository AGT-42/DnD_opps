import { useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field.jsx";
import { playerStore } from "../services/playerStore.js";
import { npcStore } from "../services/npcStore.js";
import { itemStore } from "../services/itemStore.js";
import { campaignStore } from "../services/campaignStore.js";
import SearchPicker from "../components/SearchPicker.jsx";
import { RELATIONS } from "../utils/constants.js";
import { input, label, btnPrimary, btnOutline, btnSmall } from "../utils/ui.js";

const blank = { name: "", playerName: "", race: "", charClass: "", level: 1, campaignId: "", notes: "" };
const small = "border border-line bg-white px-2 py-1.5 text-sm";
const redBtn = `bg-blood px-3 py-1.5 text-white hover:brightness-110 ${label}`;
const step = "flex h-7 w-7 items-center justify-center border border-line text-lg leading-none hover:border-blood hover:text-blood disabled:opacity-30";

// One player: who they know (NPCs) and what they're carrying (items).
function PlayerCard({ player: p, npcs, items, campaign, onEdit, onDelete, onChange }) {
  const [npcOpen, setNpcOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);
  const [npcIds, setNpcIds] = useState([]);
  const [relation, setRelation] = useState(RELATIONS[0]);
  const [itemIds, setItemIds] = useState([]);
  const [qty, setQty] = useState(1);

  const npcById = Object.fromEntries(npcs.map((n) => [n.id, n]));
  const itemById = Object.fromEntries(items.map((i) => [i.id, i]));
  const freeNpcs = npcs.filter((n) => !p.affiliations.some((a) => a.npcId === n.id));
  const npcOptions = freeNpcs.map((n) => ({ id: n.id, name: n.name, sub: [n.race, n.role].filter(Boolean).join(" · ") }));
  const itemOptions = items.map((i) => ({ id: i.id, name: i.name, sub: `${i.type} · ${i.rarity}` }));

  const save = (data) => {
    playerStore.update(p.id, data);
    onChange();
  };

  const addAffiliations = () => {
    if (npcIds.length === 0) return;
    playerStore.addAffiliations(p.id, npcIds, relation);
    setNpcIds([]);
    setNpcOpen(false);
    onChange();
  };
  const setRelationFor = (key, value) =>
    save({ affiliations: p.affiliations.map((a) => (a.key === key ? { ...a, relation: value } : a)) });
  const removeAffiliation = (key) => save({ affiliations: p.affiliations.filter((a) => a.key !== key) });

  const addItems = () => {
    if (itemIds.length === 0) return;
    playerStore.giveItems(p.id, itemIds, qty);
    setItemIds([]);
    setQty(1);
    setItemOpen(false);
    onChange();
  };
  const changeQty = (key, delta) =>
    save({ inventory: p.inventory.map((r) => (r.key === key ? { ...r, qty: Math.max(1, r.qty + delta) } : r)) });
  const removeItem = (key) => save({ inventory: p.inventory.filter((r) => r.key !== key) });

  const sub = [p.level ? `Level ${p.level}` : "", p.race, p.charClass].filter(Boolean).join(" ");

  return (
    <article className="flex flex-col border border-line bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]">
      <header className="bg-blood px-5 py-4 text-white">
        <h2 className="font-display text-3xl leading-tight">{p.name}</h2>
        {sub && <p className="text-white/85">{sub}</p>}
        {p.playerName && <p className={`mt-1 ${label} text-white/75`}>Played by {p.playerName}</p>}
        {campaign && <p className={`mt-1 ${label} text-white/75`}>Campaign: {campaign.name}</p>}
      </header>

      <div className="flex-1 space-y-6 px-5 py-5">
        {p.notes && <p className="whitespace-pre-line text-sm leading-relaxed text-mute">{p.notes}</p>}

        {/* NPC affiliations */}
        <div>
          <p className={`${label} text-blood`}>Affiliated NPCs</p>
          {p.affiliations.length === 0 && <p className="mt-1 text-sm text-mute">No NPC ties yet.</p>}
          <ul className="mt-2 divide-y divide-line border border-line">
            {p.affiliations.map((a) => {
              const n = npcById[a.npcId];
              return (
                <li key={a.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{n?.name ?? "Deleted NPC"}</p>
                    {n && [n.race, n.role].some(Boolean) && <p className="truncate text-xs text-mute">{[n.race, n.role].filter(Boolean).join(" · ")}</p>}
                  </div>
                  <select value={a.relation} onChange={(e) => setRelationFor(a.key, e.target.value)} aria-label={`Relationship with ${n?.name ?? "NPC"}`} className={small}>
                    {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={() => removeAffiliation(a.key)} aria-label={`Remove ${n?.name ?? "NPC"}`} className="text-lg font-bold leading-none text-blood">×</button>
                </li>
              );
            })}
          </ul>
          {npcs.length === 0 ? (
            <p className="mt-2 text-sm text-mute">
              Create some in the <Link to="/npcs" className="text-ink underline underline-offset-2">NPCs</Link> tab first.
            </p>
          ) : freeNpcs.length === 0 ? (
            <p className="mt-2 text-sm text-mute">Every NPC is already linked to this player.</p>
          ) : !npcOpen ? (
            <button onClick={() => setNpcOpen(true)} className={`mt-2 ${redBtn}`}>+ Add NPC</button>
          ) : (
            <div className="mt-2 space-y-2">
              <SearchPicker options={npcOptions} selected={npcIds} onChange={setNpcIds} placeholder="Search NPCs..." emptyText="No NPCs match." />
              <div className="flex flex-wrap items-center gap-2">
                <select value={relation} onChange={(e) => setRelation(e.target.value)} aria-label="Relationship for the selected NPCs" className={small}>
                  {RELATIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button onClick={addAffiliations} disabled={npcIds.length === 0} className={`${redBtn} disabled:opacity-40`}>
                  Add {npcIds.length > 0 ? `${npcIds.length} NPC${npcIds.length === 1 ? "" : "s"}` : "selected"}
                </button>
                <button onClick={() => { setNpcOpen(false); setNpcIds([]); }} className="text-sm text-mute hover:text-ink">Cancel</button>
              </div>
            </div>
          )}
        </div>

        {/* Inventory */}
        <div>
          <p className={`${label} text-blood`}>Items</p>
          {p.inventory.length === 0 && <p className="mt-1 text-sm text-mute">Nothing in their pack yet.</p>}
          <ul className="mt-2 divide-y divide-line border border-line">
            {p.inventory.map((row) => {
              const item = itemById[row.itemId];
              return (
                <li key={row.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-ink">{item?.name ?? "Deleted item"}</p>
                    {item && <p className="truncate text-xs text-mute">{item.type} · {item.rarity}{item.attunement ? " · attunement" : ""}</p>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => changeQty(row.key, -1)} disabled={row.qty <= 1} aria-label="Decrease quantity" className={step}>−</button>
                    <span className="w-6 text-center text-sm">{row.qty}</span>
                    <button onClick={() => changeQty(row.key, 1)} aria-label="Increase quantity" className={step}>+</button>
                  </div>
                  <button onClick={() => removeItem(row.key)} aria-label={`Remove ${item?.name ?? "item"}`} className="text-lg font-bold leading-none text-blood">×</button>
                </li>
              );
            })}
          </ul>
          {!itemOpen ? (
            <button onClick={() => setItemOpen(true)} className={`mt-2 ${redBtn}`}>+ Add item</button>
          ) : (
            <div className="mt-2 space-y-2">
              <SearchPicker options={itemOptions} selected={itemIds} onChange={setItemIds} placeholder="Search items..." emptyText="No items match." />
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-sm text-mute" htmlFor={`qty-${p.id}`}>Each ×</label>
                <input id={`qty-${p.id}`} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className={`${small} w-16 text-center`} />
                <button onClick={addItems} disabled={itemIds.length === 0} className={`${redBtn} disabled:opacity-40`}>
                  Give {itemIds.length > 0 ? `${itemIds.length} item${itemIds.length === 1 ? "" : "s"}` : "selected"}
                </button>
                <button onClick={() => { setItemOpen(false); setItemIds([]); }} className="text-sm text-mute hover:text-ink">Cancel</button>
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-mute">
            Missing something? Add it in the <Link to="/items" className="text-ink underline underline-offset-2">Items</Link> tab.
          </p>
        </div>
      </div>

      <footer className="flex items-center gap-3 border-t border-line px-5 py-3">
        <button onClick={onEdit} className={btnSmall}>Edit</button>
        <button onClick={onDelete} className={`ml-auto text-blood hover:underline ${label}`}>Delete</button>
      </footer>
    </article>
  );
}

export default function Players() {
  const npcs = npcStore.all();
  const items = itemStore.all();
  const campaigns = campaignStore.all();
  const campaignById = Object.fromEntries(campaigns.map((c) => [c.id, c]));
  const [filter, setFilter] = useState(""); // "" = every campaign, "none" = ungrouped, otherwise a campaign id
  const [rows, setRows] = useState(playerStore.all);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);

  const refresh = () => setRows(playerStore.all());
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(blank);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only the profile fields: NPC ties and items are managed on the card, so editing never touches them.
    const data = {
      name: form.name.trim(),
      playerName: form.playerName,
      race: form.race,
      charClass: form.charClass,
      level: Math.max(1, Math.min(20, Number(form.level) || 1)),
      campaignId: form.campaignId,
      notes: form.notes,
    };
    if (editingId) playerStore.update(editingId, data);
    else playerStore.create({ ...data, affiliations: [], inventory: [] });
    refresh();
    closeForm();
  };

  const startEdit = (p) => {
    setEditingId(p.id);
    setForm({ ...blank, ...p });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (p) => {
    if (!window.confirm(`Delete ${p.name}?`)) return;
    playerStore.remove(p.id);
    refresh();
    if (editingId === p.id) closeForm();
  };

  // Group players by campaign. Players pointing at a deleted campaign count as ungrouped.
  const groups = [
    ...campaigns.map((c) => ({ id: c.id, title: c.name, players: rows.filter((p) => p.campaignId === c.id) })),
    { id: "none", title: "No campaign", players: rows.filter((p) => !campaignById[p.campaignId]) },
  ].filter((g) => g.players.length > 0 && (filter === "" || filter === g.id));

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">Players</h1>
        <div className="flex flex-wrap items-center gap-3">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by campaign" className="border border-line bg-white px-3 py-2">
            <option value="">All campaigns</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="none">No campaign</option>
          </select>
          {!formOpen && <button onClick={() => setFormOpen(true)} className={btnPrimary}>Add player</button>}
        </div>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mb-8 max-w-3xl space-y-4 border border-line bg-white p-5">
          <h2 className="font-display text-2xl">{editingId ? `Edit ${form.name || "player"}` : "New player"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Character name"><input name="name" value={form.name} onChange={set} required className={input} /></Field>
            <Field label="Player (real name)"><input name="playerName" value={form.playerName} onChange={set} className={input} /></Field>
            <Field label="Race"><input name="race" value={form.race} onChange={set} className={input} /></Field>
            <Field label="Class"><input name="charClass" value={form.charClass} onChange={set} className={input} /></Field>
            <Field label="Level"><input type="number" name="level" min="1" max="20" value={form.level} onChange={set} className={input} /></Field>
            <Field label="Campaign">
              <select name="campaignId" value={form.campaignId ?? ""} onChange={set} className={input}>
                <option value="">No campaign</option>
                {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Notes">
            <textarea name="notes" rows="3" value={form.notes} onChange={set} className={input} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary}>{editingId ? "Save changes" : "Add player"}</button>
            <button type="button" onClick={closeForm} className={btnOutline}>Cancel</button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-mute">No players yet. Add your party with the button above.</p>
      ) : (
        <div className="space-y-10">
          {groups.map((g) => (
            <div key={g.id}>
              {(filter === "" ? campaigns.length > 0 : true) && (
                <div className="mb-4 flex items-baseline justify-between gap-3 border-b-2 border-ink pb-2">
                  <h2 className="font-display text-3xl text-ink">{g.title}</h2>
                  <p className={`${label} text-mute`}>{g.players.length} player{g.players.length === 1 ? "" : "s"}</p>
                </div>
              )}
              <div className="grid gap-6 lg:grid-cols-2 2xl:grid-cols-3">
                {g.players.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    npcs={npcs}
                    items={items}
                    campaign={campaignById[p.campaignId]}
                    onEdit={() => startEdit(p)}
                    onDelete={() => handleDelete(p)}
                    onChange={refresh}
                  />
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && <p className="text-mute">No players in that campaign yet.</p>}
        </div>
      )}
    </section>
  );
}
