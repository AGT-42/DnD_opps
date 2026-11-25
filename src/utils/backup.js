// Export / import everything this app keeps in the browser, so it can move between devices.
// Only the data tables are included (not display preferences like "cards across").
export const DATA_KEYS = [
  ["mb:monsters", "monsters"],
  ["mb:campaigns", "campaigns"],
  ["mb:players", "players"],
  ["mb:npcs", "npcs"],
  ["mb:items", "items"],
  ["mb:lore", "lore places"],
  ["mb:hp", "monster HP"],
  ["mb:slots", "spell slots"],
];

const read = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export function buildBackup() {
  const data = {};
  DATA_KEYS.forEach(([key]) => {
    const value = read(key);
    if (value !== null) data[key] = value;
  });
  return { app: "monster-maker", version: 1, exportedAt: new Date().toISOString(), data };
}

export function downloadBackup() {
  const backup = buildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `monster-maker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return Object.keys(backup.data).length;
}

// Reads and checks a backup file's text. Throws a readable Error if it isn't one of ours.
export function parseBackup(text) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (backup?.app !== "monster-maker" || typeof backup.data !== "object" || backup.data === null) {
    throw new Error("That doesn't look like a Monster Maker backup.");
  }
  const known = new Set(DATA_KEYS.map(([k]) => k));
  const data = Object.fromEntries(Object.entries(backup.data).filter(([k]) => known.has(k)));
  return { exportedAt: backup.exportedAt, data };
}

// Counts what's inside, for the preview shown before importing.
export function summarize(data) {
  return DATA_KEYS.filter(([key]) => key in data).map(([key, name]) => {
    const v = data[key];
    return { key, name, count: Array.isArray(v) ? v.length : Object.keys(v ?? {}).length };
  });
}

// mode "replace": the imported data overwrites this device's data.
// mode "merge":   anything missing here is added; if both devices have the same entry, this device's version is kept.
export function applyBackup(data, mode) {
  Object.entries(data).forEach(([key, incoming]) => {
    if (mode === "replace") {
      localStorage.setItem(key, JSON.stringify(incoming));
      return;
    }
    const current = read(key);
    if (Array.isArray(incoming)) {
      const rows = Array.isArray(current) ? current : [];
      const have = new Set(rows.map((r) => r.id));
      localStorage.setItem(key, JSON.stringify([...rows, ...incoming.filter((r) => !have.has(r.id))]));
    } else {
      localStorage.setItem(key, JSON.stringify({ ...incoming, ...(current ?? {}) }));
    }
  });
}
