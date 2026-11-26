import { useState } from "react";
import DragGrip from "./DragGrip.jsx";
import { createStore } from "../services/storage.js";
import { useDragDrop } from "../utils/useDragDrop.js";
import { moveCard, moveGroup, moveToGroup } from "../utils/reorder.js";
import { input, label, btnOutline, btnSmall } from "../utils/ui.js";

const stores = {};
const groupStore = (key) => (stores[key] ??= createStore(key));

// A card grid where cards can be dragged to reorder them and dropped into named folders; whole folders can be dragged too.
//   rows          every saved item (their order is the saved order; each may have a groupId)
//   shown         the rows to display right now (after search / filters)
//   onRowsChange  called with the full new list whenever a drag or group change reorders it
//   children      (item, ui) => card. ui.grip, ui.articleProps, ui.stateClass and ui.groupPicker plug into the card.
export default function GroupBoard({ groupKey, rows, shown, filtering, emptyText, onRowsChange, adding, onAddingChange, children }) {
  const store = groupStore(groupKey);
  const [groups, setGroups] = useState(store.all);
  const [renamingId, setRenamingId] = useState(null);

  const saveGroups = (next) => {
    store.replaceAll(next);
    setGroups(next);
  };

  const validIds = new Set(groups.map((g) => g.id));
  const groupOf = (r) => (validIds.has(r.groupId) ? r.groupId : ""); // a deleted group's cards count as ungrouped
  const itemsIn = (id) => shown.filter((r) => groupOf(r) === id);

  const dnd = useDragDrop({
    accepts: (d, t) =>
      d.kind === "card"
        ? t.kind === "card" ? t.id !== d.id : t.kind === "group"
        : d.kind === "group" && t.kind === "group" && t.id !== "" && t.id !== d.id,
    onDrop: (d, t) => {
      if (d.kind === "group") return saveGroups(moveGroup(groups, d.id, t.id));
      onRowsChange(t.kind === "card" ? moveCard(rows, d.id, t.id) : moveToGroup(rows, d.id, t.id));
    },
  });

  const addGroup = (name) => {
    saveGroups([...groups, { id: crypto.randomUUID(), name, collapsed: false }]);
    onAddingChange(false);
  };
  const patchGroup = (id, patch) => saveGroups(groups.map((g) => (g.id === id ? { ...g, ...patch } : g)));
  const deleteGroup = (g) => {
    const count = rows.filter((r) => r.groupId === g.id).length;
    const note = count ? ` Its ${count} card${count === 1 ? "" : "s"} will be taken out of the folder.` : "";
    if (!window.confirm(`Delete the folder "${g.name}"?${note}`)) return;
    if (count) onRowsChange(rows.map((r) => (r.groupId === g.id ? { ...r, groupId: "" } : r)));
    saveGroups(groups.filter((x) => x.id !== g.id));
  };

  const cardUi = (item) => {
    const dragging = dnd.drag?.kind === "card" && dnd.drag.id === item.id;
    const dropTarget = dnd.isOver("card", item.id);
    return {
      grip: <DragGrip gripProps={dnd.gripProps("card", item.id)} />,
      articleProps: { ...dnd.dropProps("card", item.id), "data-drag-image": true },
      stateClass: `${dropTarget ? "border-blood outline-dashed outline-4 outline-blood" : "border-line"} ${dragging ? "opacity-40" : ""}`,
      // A plain dropdown does the same job as dragging, for keyboards and fiddly touch screens.
      groupPicker: groups.length > 0 && (
        <select
          aria-label="Move to folder"
          value={groupOf(item)}
          onChange={(e) => onRowsChange(moveToGroup(rows, item.id, e.target.value))}
          className={`max-w-40 border border-line bg-white px-2 py-1.5 text-ink ${label}`}
        >
          <option value="">No folder</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      ),
    };
  };

  const grid = (items) => (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <div key={item.id} className="contents">{children(item, cardUi(item))}</div>)}
    </div>
  );

  const hint = (text) => (
    <p className="border border-dashed border-line px-4 py-5 text-center text-sm text-mute">{text}</p>
  );

  const ungrouped = itemsIn("");
  const draggingCard = dnd.drag?.kind === "card";
  const visibleGroups = filtering ? groups.filter((g) => itemsIn(g.id).length > 0) : groups;
  const showUngrouped = groups.length > 0 && (ungrouped.length > 0 || draggingCard);

  const ungroupedSection = (
    <div key="ungrouped" {...dnd.dropProps("group", "")} className={`space-y-4 ${dnd.isOver("group", "") ? "outline-dashed outline-4 outline-offset-4 outline-blood" : ""}`}>
      <h2 className={`${label} border-b-2 border-line pb-2 text-mute`}>No folder · {ungrouped.length}</h2>
      {ungrouped.length > 0 ? grid(ungrouped) : hint("Drop here to take a card out of its folder")}
    </div>
  );

  return (
    <div className="space-y-8">
      {(groups.length > 0 || adding) && <div className="flex flex-wrap items-center justify-between gap-3">
        {groups.length > 0 ? <span className="text-sm text-mute">Drag the grips to reorder cards, move them between folders, or move a whole folder.</span> : <span />}
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get("name").trim();
              if (name) addGroup(name);
            }}
            className="flex flex-wrap items-center gap-3"
          >
            <input name="name" autoFocus required placeholder="Folder name" aria-label="Folder name" className={`${input} w-56`} />
            <button className={btnSmall}>Create folder</button>
            <button type="button" onClick={() => onAddingChange(false)} className={`text-mute hover:text-ink ${label}`}>Cancel</button>
          </form>
        ) : null}
      </div>}

      {shown.length === 0 && (filtering || groups.length === 0) ? (
        <p className="text-mute">{emptyText}</p>
      ) : groups.length === 0 ? (
        grid(shown)
      ) : (
        <>
          {ungrouped.length > 0 && ungroupedSection}
          {visibleGroups.map((g) => {
            const items = itemsIn(g.id);
            const groupDragging = dnd.drag?.kind === "group" && dnd.drag.id === g.id;
            return (
              <div
                key={g.id}
                {...dnd.dropProps("group", g.id)}
                className={`space-y-4 ${groupDragging ? "opacity-40" : ""} ${dnd.isOver("group", g.id) ? "outline-dashed outline-4 outline-offset-4 outline-blood" : ""}`}
              >
                <div data-drag-image className="flex flex-wrap items-center gap-3 bg-blood p-2 text-white">
                  <DragGrip variant="square" gripProps={dnd.gripProps("group", g.id)} label="Drag to move this whole folder" />
                  {renamingId === g.id ? (
                    <input
                      autoFocus
                      defaultValue={g.name}
                      aria-label="Folder name"
                      onBlur={(e) => {
                        const name = e.target.value.trim();
                        if (name) patchGroup(g.id, { name });
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") e.currentTarget.blur();
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      className="min-w-0 flex-1 border border-line bg-white px-2 py-1 font-display text-2xl text-ink"
                    />
                  ) : (
                    <h2 className="min-w-0 flex-1 font-display text-3xl leading-tight">
                      {g.name} <span className="text-lg text-white/75">· {items.length}</span>
                    </h2>
                  )}
                  <button onClick={() => patchGroup(g.id, { collapsed: !g.collapsed })} aria-expanded={!g.collapsed} className={`px-2 py-2 hover:underline ${label}`}>
                    {g.collapsed ? "Show" : "Hide"}
                  </button>
                  <button onClick={() => setRenamingId(g.id)} className={`px-2 py-2 hover:underline ${label}`}>Rename</button>
                  <button onClick={() => deleteGroup(g)} className={`px-2 py-2 hover:underline ${label}`}>Delete</button>
                </div>
                {!g.collapsed && (items.length > 0 ? grid(items) : hint(filtering ? "No matches in this folder" : "Empty folder. Drag cards here."))}
              </div>
            );
          })}
          {ungrouped.length === 0 && showUngrouped && ungroupedSection}
        </>
      )}
    </div>
  );
}
