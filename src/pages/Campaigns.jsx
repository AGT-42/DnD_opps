import { useState } from "react";
import { Link } from "react-router-dom";
import StatBlockCard from "../components/StatBlockCard.jsx";
import InitiativeTracker from "../components/InitiativeTracker.jsx";
import Masonry from "../components/Masonry.jsx";
import { campaignStore, newKey } from "../services/campaignStore.js";
import { monsterStore } from "../services/monsterStore.js";
import { playerStore } from "../services/playerStore.js";
import { setHp } from "../services/hpStore.js";
import { CR_LIST, scaleMonster } from "../utils/cr.js";
import { useDragDrop } from "../utils/useDragDrop.js";

const input = "w-full border border-line bg-white px-3 py-2 text-ink";
const cell = "px-4 py-2 align-top";
const blank = { name: "", description: "", monsterIds: [] };
const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const MODE_KEY = "mb:campaignMode";
const COLS_KEY = "mb:campaignCols";
const PICK_KEY = "mb:campaignPick"; // which campaign's full stat blocks to show ("all" or a campaign id)
const COL_CHOICES = [1, 2, 3, 4, 5];

const MODES = [
  ["table", "Summary table"],
  ["blocks", "Full stat blocks"],
];

const loadMode = () => {
  try {
    return localStorage.getItem(MODE_KEY) === "blocks" ? "blocks" : "table";
  } catch {
    return "table";
  }
};

const loadCols = () => {
  try {
    const n = Number(localStorage.getItem(COLS_KEY));
    return COL_CHOICES.includes(n) ? n : 3;
  } catch {
    return 3;
  }
};

const loadPick = () => {
  try {
    return localStorage.getItem(PICK_KEY) ?? "";
  } catch {
    return "";
  }
};

const dexMod = (dex) => Math.floor((Number(dex) - 10) / 2);

export default function Campaigns() {
  const monsters = monsterStore.all();
  const players = playerStore.all();
  const [rows, setRows] = useState(campaignStore.all);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [mode, setMode] = useState(loadMode);
  const [cols, setCols] = useState(loadCols);
  const [pick, setPick] = useState(loadPick);

  const refresh = () => setRows(campaignStore.all());

  const chooseMode = (next) => {
    setMode(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      /* storage unavailable: the mode just won't be remembered */
    }
  };

  const choosePick = (value) => {
    setPick(value);
    try {
      localStorage.setItem(PICK_KEY, value);
    } catch {
      /* storage unavailable */
    }
  };

  const chooseCols = (n) => {
    setCols(n);
    try {
      localStorage.setItem(COLS_KEY, String(n));
    } catch {
      /* storage unavailable */
    }
  };

  const reset = () => {
    setEditingId(null);
    setForm(blank);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { monsterIds, ...rest } = form;
    const data = { ...rest, name: form.name.trim() };
    if (editingId) {
      // Keep existing individuals (incl. duplicates) of monsters still ticked; add one for each newly ticked monster.
      const current = rows.find((c) => c.id === editingId).members;
      const kept = current.filter((m) => monsterIds.includes(m.monsterId));
      const added = monsterIds
        .filter((id) => !current.some((m) => m.monsterId === id))
        .map((monsterId) => ({ key: newKey(), monsterId }));
      campaignStore.update(editingId, { ...data, members: [...kept, ...added] });
    } else {
      campaignStore.create({ ...data, members: monsterIds.map((monsterId) => ({ key: newKey(), monsterId })), tracker: undefined });
    }
    refresh();
    reset();
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({ name: c.name, description: c.description, monsterIds: [...new Set(c.members.map((m) => m.monsterId))] });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (c) => {
    if (!window.confirm(`Delete campaign "${c.name}"?`)) return;
    campaignStore.remove(c.id);
    playerStore.forgetCampaign(c.id); // its players become ungrouped
    refresh();
    if (editingId === c.id) reset();
  };

  const toggle = (id) =>
    setForm((f) => ({
      ...f,
      monsterIds: f.monsterIds.includes(id) ? f.monsterIds.filter((x) => x !== id) : [...f.monsterIds, id],
    }));

  // ---- individual creatures inside a campaign ----
  const saveMembers = (c, members) => {
    campaignStore.update(c.id, { members });
    refresh();
  };

  const duplicate = (c, member, base) => {
    const labels = c.members.filter((m) => m.monsterId === member.monsterId).map((m) => m.label || base.name);
    let n = labels.length + 1;
    while (labels.includes(`${base.name} ${n}`)) n++;
    const copy = { ...member, key: newKey(), label: `${base.name} ${n}`, combat: false, conditions: undefined };
    // First duplicate: also number the original. The copy goes after the last of its kind.
    const numbered = c.members.map((m) => (m.key === member.key && !m.label ? { ...m, label: `${base.name} 1` } : m));
    const last = numbered.map((m) => m.monsterId).lastIndexOf(member.monsterId);
    const members = [...numbered.slice(0, last + 1), copy, ...numbered.slice(last + 1)];
    saveMembers(c, members);
  };

  const patchMember = (c, key, patch) => saveMembers(c, c.members.map((m) => (m.key === key ? { ...m, ...patch } : m)));

  const removeMember = (c, member, name) => {
    if (!window.confirm(`Remove ${name} from "${c.name}"?`)) return;
    saveMembers(c, c.members.filter((m) => m.key !== member.key));
  };

  // Combat: only monsters flagged here appear in the initiative tracker.
  const toggleCombat = (c, member) => {
    const joining = !member.combat;
    // Cards in combat sit at the front. The toggled card lands on the boundary: right after the
    // combat group when joining, right behind it when leaving.
    const others = c.members.filter((m) => m.key !== member.key);
    const members = [
      ...others.filter((m) => m.combat),
      { ...member, combat: joining },
      ...others.filter((m) => !m.combat),
    ];
    const patch = { members };
    if (!joining) {
      const tracker = c.tracker ?? {};
      const init = { ...(tracker.init ?? {}) };
      delete init[member.key];
      patch.tracker = { ...tracker, init, active: tracker.active === member.key ? null : tracker.active };
    }
    campaignStore.update(c.id, patch);
    refresh();
  };

  const endCombat = (c) => {
    campaignStore.update(c.id, {
      members: c.members.map((m) => ({ ...m, combat: false, conditions: undefined })), // a fresh fight starts with no conditions
      tracker: { ...(c.tracker ?? {}), round: 1, active: null, init: {} },
    });
    refresh();
  };

  // Drag a card onto another to move it there (so the monsters you're using sit together).
  const moveCard = (c, fromKey, toKey) => {
    if (fromKey === toKey) return;
    const from = c.members.findIndex((m) => m.key === fromKey);
    const to = c.members.findIndex((m) => m.key === toKey);
    if (from === -1 || to === -1) return;
    const list = [...c.members];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved); // lands in the target's slot, pushing it along
    saveMembers(c, list);
  };

  // Mouse and touch drag share one engine; only cards inside the same campaign can swap places.
  const dnd = useDragDrop({
    accepts: (d, t) => d.kind === "card" && t.kind === "card" && d.id !== t.id,
    onDrop: (d, t) => {
      const c = rows.find((x) => x.members.some((m) => m.key === d.id) && x.members.some((m) => m.key === t.id));
      if (c) moveCard(c, d.id, t.id);
    },
  });

  const stepCr = (c, member, base, shown, dir) => {
    const next = CR_LIST[CR_LIST.indexOf(shown.cr) + dir];
    if (!next) return;
    setCr(c, member, base, next);
  };

  const setCr = (c, member, base, cr) => {
    const scaled = cr === base.cr ? base : scaleMonster(base, cr);
    setHp(`inst-${member.key}`, base.id, scaled.hp); // new stats = fresh, full health
    patchMember(c, member.key, { cr: cr === base.cr ? undefined : cr });
  };

  // Which campaign's full stat blocks are shown. A saved pick that no longer exists falls back to the first campaign.
  const activePick = pick === "all" || rows.some((c) => c.id === pick) ? pick : rows[0]?.id ?? "all";
  const shownRows = activePick === "all" ? rows : rows.filter((c) => c.id === activePick);

  // Deleted monsters quietly drop out of a campaign.
  const resolve = (c) =>
    c.members
      .map((member) => {
        const base = monsters.find((m) => m.id === member.monsterId);
        if (!base) return null;
        const shown = member.cr && member.cr !== base.cr ? scaleMonster(base, member.cr) : base;
        return { member, base, shown, name: member.label || base.name };
      })
      .filter(Boolean);

  return (
    <section className="space-y-10">
      <div>
        <h1 className="font-display text-5xl text-ink">Campaigns</h1>
        <p className="mt-2 text-mute">Group monsters into a campaign, then run them side by side. Everything is saved in this browser.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 border border-line bg-white p-5">
        <h2 className="font-display text-2xl text-ink">{editingId ? "Edit campaign" : "New campaign"}</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Campaign name" required className={input} />
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" className={input} />
        </div>
        <fieldset>
          <legend className="mb-2 text-sm text-mute">Monsters in this campaign (use Duplicate on a stat block to add more of the same)</legend>
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {monsters.map((m) => (
              <label key={m.id} className="flex items-center gap-2">
                <input type="checkbox" checked={form.monsterIds.includes(m.id)} onChange={() => toggle(m.id)} />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="flex gap-3">
          <button className="bg-blood px-5 py-2 font-bold text-white hover:brightness-110">{editingId ? "Save changes" : "Add campaign"}</button>
          {editingId && <button type="button" onClick={reset} className="text-mute hover:text-ink">Cancel</button>}
        </div>
      </form>

      {rows.length === 0 ? (
        <p className="text-mute">You have no campaigns yet. Add your first one above.</p>
      ) : (
        <>
          {/* Display mode */}
          <div className="flex flex-wrap items-center gap-4">
            <span className={`${label} text-mute`}>Display</span>
            <div role="group" aria-label="Display mode" className="flex border border-ink">
              {MODES.map(([value, text]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => chooseMode(value)}
                  className={`px-5 py-2.5 ${label} ${mode === value ? "bg-ink text-paper" : "hover:bg-ink/10"}`}
                >
                  {text}
                </button>
              ))}
            </div>
            {mode === "blocks" && rows.length > 1 && (
              <>
                <label htmlFor="campaign-pick" className={`${label} ml-4 text-mute`}>Campaign</label>
                <select
                  id="campaign-pick"
                  value={activePick}
                  onChange={(e) => choosePick(e.target.value)}
                  className="border border-ink bg-white px-3 py-2.5 text-ink"
                >
                  <option value="all">All campaigns</option>
                  {rows.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}
            {mode === "blocks" && (
              <>
                <span className={`${label} ml-4 text-mute`}>Cards across</span>
                <div role="group" aria-label="Cards across" className="flex border border-ink">
                  {COL_CHOICES.map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-pressed={cols === n}
                      onClick={() => chooseCols(n)}
                      className={`w-11 py-2.5 ${label} ${cols === n ? "bg-ink text-paper" : "hover:bg-ink/10"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {mode === "table" ? (
            <div className="overflow-x-auto border border-line">
              <table className="w-full text-left">
                <thead className="bg-ink text-paper">
                  <tr>{["Name", "Description", "Players", "Monsters", "Actions"].map((h) => <th key={h} className={`${cell} font-bold`}>{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => {
                    const members = resolve(c);
                    return (
                      <tr key={c.id}>
                        <td className={`${cell} text-ink`}>{c.name}</td>
                        <td className={cell}>{c.description || <span className="text-mute">-</span>}</td>
                        <td className={cell}>
                          {players.filter((p) => p.campaignId === c.id).map((p) => p.name).join(", ") || <span className="text-mute">None</span>}
                        </td>
                        <td className={cell}>
                          {members.length
                            ? members.map((r, i) => (
                                <span key={r.member.key}>{i > 0 && ", "}<Link to={`/monsters/${r.base.id}`} className="hover:text-blood">{r.name}</Link></span>
                              ))
                            : <span className="text-mute">None</span>}
                        </td>
                        <td className={`${cell} whitespace-nowrap`}>
                          <button onClick={() => { choosePick(c.id); chooseMode("blocks"); }} className="mr-3 font-semibold text-blood hover:underline">Full stats</button>
                          <button onClick={() => startEdit(c)} className="mr-3 hover:text-blood">Edit</button>
                          <button onClick={() => handleDelete(c)} className="text-blood hover:underline">Delete</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-14">
              {shownRows.map((c) => {
                const members = resolve(c);
                const tracker = c.tracker ?? {};
                return (
                  <div key={c.id}>
                    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b-2 border-ink pb-3">
                      <div>
                        <h2 className="font-display text-4xl text-ink">{c.name}</h2>
                        {c.description && <p className="mt-1 text-mute">{c.description}</p>}
                        {players.some((p) => p.campaignId === c.id) && (
                          <p className="mt-1 text-sm text-mute">
                            Party: {players.filter((p) => p.campaignId === c.id).map((p) => p.name).join(", ")}
                          </p>
                        )}
                      </div>
                      <div className="whitespace-nowrap">
                        <button onClick={() => startEdit(c)} className="mr-4 hover:text-blood">Edit</button>
                        <button onClick={() => handleDelete(c)} className="text-blood hover:underline">Delete</button>
                      </div>
                    </div>

                    <div className="gap-6 md:flex md:items-start">
                      <aside className="mb-6 md:sticky md:top-4 md:mb-0 md:max-h-[calc(100vh-2rem)] md:w-60 md:shrink-0 md:overflow-y-auto">
                        <InitiativeTracker
                          tracker={c.tracker}
                          combatants={members.filter((r) => r.member.combat).map((r) => ({ key: r.member.key, name: r.name, dexMod: dexMod(r.shown.dex) }))}
                          onEndCombat={() => endCombat(c)}
                          onChange={(next) => {
                            campaignStore.update(c.id, { tracker: next });
                            refresh();
                          }}
                        />
                      </aside>

                      <div className="min-w-0 flex-1">
                        {members.length === 0 ? (
                          <p className="text-mute">No monsters in this campaign yet. Use Edit to add some.</p>
                        ) : (
                          <Masonry
                            columns={cols}
                            items={members.map((r) => ({
                              key: r.member.key,
                              node: (
                                <StatBlockCard
                                  monster={r.shown}
                                  name={r.name}
                                  scope={`inst-${r.member.key}`}
                                  baseCr={r.base.cr}
                                  active={tracker.active === r.member.key}
                                  initiative={tracker.init?.[r.member.key]}
                                  inCombat={!!r.member.combat}
                                  onToggleCombat={() => toggleCombat(c, r.member)}
                                  dragging={dnd.drag?.id === r.member.key}
                                  dropTarget={dnd.isOver("card", r.member.key)}
                                  gripProps={dnd.gripProps("card", r.member.key)}
                                  dropProps={dnd.dropProps("card", r.member.key)}
                                  conditions={r.member.conditions ?? []}
                                  onConditionsChange={(conditions) => patchMember(c, r.member.key, { conditions })}
                                  onRename={(label) => patchMember(c, r.member.key, { label: label && label !== r.base.name ? label : undefined })}
                                  onDuplicate={() => duplicate(c, r.member, r.base)}
                                  onRemove={() => removeMember(c, r.member, r.name)}
                                  onCrStep={(dir) => stepCr(c, r.member, r.base, r.shown, dir)}
                                  onCrReset={() => setCr(c, r.member, r.base, r.base.cr)}
                                />
                              ),
                            }))}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
