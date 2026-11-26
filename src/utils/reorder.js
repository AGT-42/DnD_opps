// Pure helpers for drag-and-drop ordering. Each takes a list and returns a new list (or the same one if nothing changes).

// Drop one card onto another. Same group: it lands in the target's slot (like the combat tab).
// Different group: it joins the target's group, just before the target.
export function moveCard(rows, fromId, toId) {
  if (fromId === toId) return rows;
  const from = rows.findIndex((r) => r.id === fromId);
  const target = rows.find((r) => r.id === toId);
  if (from === -1 || !target) return rows;
  const groupId = target.groupId || "";
  const moved = { ...rows[from], groupId };
  const list = [...rows];
  if ((rows[from].groupId || "") === groupId) {
    const to = rows.findIndex((r) => r.id === toId);
    list.splice(from, 1);
    list.splice(to, 0, moved);
    return list;
  }
  list.splice(from, 1);
  list.splice(list.findIndex((r) => r.id === toId), 0, moved);
  return list;
}

// Drop a card on a group (or on "" for ungrouped): it goes to the end of that group.
export function moveToGroup(rows, id, groupId) {
  const item = rows.find((r) => r.id === id);
  if (!item) return rows;
  const list = rows.filter((r) => r.id !== id);
  const moved = { ...item, groupId };
  let last = -1;
  list.forEach((r, i) => {
    if ((r.groupId || "") === groupId) last = i;
  });
  list.splice(last === -1 ? list.length : last + 1, 0, moved);
  return list;
}

// Drop a whole group onto another group to swap its place in the list of groups.
export function moveGroup(groups, fromId, toId) {
  const from = groups.findIndex((g) => g.id === fromId);
  const to = groups.findIndex((g) => g.id === toId);
  if (from === -1 || to === -1 || from === to) return groups;
  const list = [...groups];
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  return list;
}
