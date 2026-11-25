import { useState } from "react";
import { Link } from "react-router-dom";
import Field from "../components/Field.jsx";
import { itemStore } from "../services/itemStore.js";
import { playerStore } from "../services/playerStore.js";
import SearchPicker from "../components/SearchPicker.jsx";
import { ITEM_TYPES, RARITIES } from "../utils/constants.js";
import { input, label, btnPrimary, btnOutline, btnSmall } from "../utils/ui.js";

const blank = { name: "", type: "Wondrous item", rarity: "Uncommon", value: "", attunement: false, description: "" };

const rarityStyle = (r) =>
  r === "Mundane" || r === "Common" ? "text-mute"
  : r === "Uncommon" || r === "Rare" ? "text-blood"
  : "text-ink";

export default function Items() {
  const players = playerStore.all();
  const [rows, setRows] = useState(itemStore.all);
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [notice, setNotice] = useState("");
  const [givingId, setGivingId] = useState(null); // which item card has its "give" panel open
  const [picked, setPicked] = useState([]); // player ids ticked in that panel
  const [qty, setQty] = useState(1);

  const refresh = () => setRows(itemStore.all());
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setForm(blank);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, name: form.name.trim() };
    if (editingId) itemStore.update(editingId, data);
    else itemStore.create(data);
    refresh();
    closeForm();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({ ...blank, ...item });
    setFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (item) => {
    if (!window.confirm(`Delete ${item.name}? It will also be removed from every player's inventory.`)) return;
    itemStore.remove(item.id);
    playerStore.forgetItem(item.id);
    refresh();
    if (editingId === item.id) closeForm();
  };

  const handleRestore = () => {
    const n = itemStore.restoreDefaults();
    refresh();
    setNotice(n ? `Restored ${n} default item${n === 1 ? "" : "s"}.` : "All default items are already in your list.");
  };

  const openGive = (item) => {
    setGivingId(givingId === item.id ? null : item.id);
    setPicked([]);
    setQty(1);
  };

  const give = (item) => {
    if (picked.length === 0) return;
    picked.forEach((playerId) => playerStore.giveItem(playerId, item.id, qty));
    const names = players.filter((p) => picked.includes(p.id)).map((p) => p.name);
    setNotice(`Gave ${item.name}${Number(qty) > 1 ? ` ×${qty}` : ""} to ${names.join(", ")}.`);
    setGivingId(null);
    setPicked([]);
    refresh(); // re-read so the "Held by" chips update
  };

  const duplicate = (item) => {
    const { id, createdAt, ...rest } = item; // eslint-disable-line no-unused-vars
    const copy = itemStore.create({ ...rest, name: `${item.name} (copy)` });
    refresh();
    startEdit(copy); // open the copy straight away so it can be renamed and tweaked
    setNotice(`Duplicated ${item.name}. Rename the copy and save.`);
  };

  const q = query.toLowerCase();
  const shown = rows
    .filter((i) => (!type || i.type === type) && [i.name, i.description, i.rarity].some((v) => (v ?? "").toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-5xl text-ink">Items</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search items" className="border border-line bg-white px-3 py-2" />
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Filter by type" className="border border-line bg-white px-3 py-2">
            <option value="">All types</option>
            {ITEM_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
          {!formOpen && <button onClick={() => setFormOpen(true)} className={btnPrimary}>Add item</button>}
        </div>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="mb-8 max-w-3xl space-y-4 border border-line bg-white p-5">
          <h2 className="font-display text-2xl">{editingId ? `Edit ${form.name || "item"}` : "New item"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" className="sm:col-span-2"><input name="name" value={form.name} onChange={set} required className={input} /></Field>
            <Field label="Type">
              <select name="type" value={form.type} onChange={set} className={input}>
                {ITEM_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Rarity">
              <select name="rarity" value={form.rarity} onChange={set} className={input}>
                {RARITIES.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Value (e.g. 50 gp)"><input name="value" value={form.value} onChange={set} className={input} /></Field>
            <label className="flex items-center gap-2 self-end pb-2 text-ink">
              <input type="checkbox" name="attunement" checked={!!form.attunement} onChange={set} className="h-4 w-4 accent-blood" />
              Requires attunement
            </label>
          </div>
          <Field label="Description / effects">
            <textarea name="description" rows="4" value={form.description} onChange={set} className={input} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <button className={btnPrimary}>{editingId ? "Save changes" : "Add item"}</button>
            <button type="button" onClick={closeForm} className={btnOutline}>Cancel</button>
          </div>
        </form>
      )}

      {notice && <p className="mb-4 text-sm text-ink" role="status">{notice}</p>}

      {shown.length === 0 ? (
        <p className="text-mute">No items match that search.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((item) => {
            const holders = players
              .map((p) => ({ p, row: p.inventory.find((r) => r.itemId === item.id) }))
              .filter((x) => x.row);
            return (
              <article key={item.id} className="flex flex-col border border-line bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)]">
                <header className="px-5 pb-3 pt-5">
                  <h2 className="font-display text-2xl leading-tight text-ink">{item.name}</h2>
                  <p className="text-sm">
                    <span className="text-mute">{item.type} · </span>
                    <span className={`font-semibold ${rarityStyle(item.rarity)}`}>{item.rarity}</span>
                    {item.attunement && <span className="text-mute"> · attunement</span>}
                  </p>
                  {item.value && <p className={`mt-1 ${label} text-blood`}>{item.value}</p>}
                </header>

                <div className="flex-1 space-y-3 px-5 pb-4 text-sm leading-relaxed text-mute">
                  {item.description && <p className="whitespace-pre-line">{item.description}</p>}
                  {holders.length > 0 && (
                    <div>
                      <p className={`${label} text-blood`}>Held by</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {holders.map(({ p, row }) => (
                          <span key={p.id} className="border border-line bg-paper px-2 py-1 text-xs text-ink">{p.name} × {row.qty}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {givingId === item.id && (
                  <div className="space-y-2 border-t border-line px-5 py-3">
                    <p className={`${label} text-blood`}>Give to players</p>
                    <SearchPicker
                      options={players.map((p) => ({ id: p.id, name: p.name, sub: p.playerName }))}
                      selected={picked}
                      onChange={setPicked}
                      placeholder="Search players..."
                      emptyText="No players match."
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="text-sm text-mute" htmlFor={`give-qty-${item.id}`}>Each ×</label>
                      <input id={`give-qty-${item.id}`} type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 border border-line bg-white px-2 py-1.5 text-center text-sm" />
                      <button onClick={() => give(item)} disabled={picked.length === 0} className={`${btnSmall} disabled:opacity-40`}>
                        Give{picked.length > 0 ? ` to ${picked.length}` : ""}
                      </button>
                      <button onClick={() => setGivingId(null)} className="text-sm text-mute hover:text-ink">Cancel</button>
                    </div>
                  </div>
                )}

                <footer className="flex flex-wrap items-center gap-3 border-t border-line px-5 py-3">
                  <button
                    onClick={() => openGive(item)}
                    disabled={players.length === 0}
                    title={players.length === 0 ? "Add a player first" : undefined}
                    className={`bg-blood px-3 py-1.5 text-white hover:brightness-110 ${label} disabled:opacity-40`}
                  >
                    {players.length === 0 ? "No players yet" : "+ Give to player"}
                  </button>
                  <button onClick={() => startEdit(item)} className={btnSmall}>Edit</button>
                  <button onClick={() => duplicate(item)} className={btnSmall}>Duplicate</button>
                  <button onClick={() => handleDelete(item)} className={`ml-auto text-blood hover:underline ${label}`}>Delete</button>
                </footer>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-line pt-5 text-sm text-mute">
        <button onClick={handleRestore} className={btnSmall}>Restore deleted defaults</button>
        <span>
          Items go to players from here or from the <Link to="/players" className="text-ink underline underline-offset-2">Players</Link> tab.
        </span>
      </div>
    </section>
  );
}
