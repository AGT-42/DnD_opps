// Tiny "table" helper: one localStorage key = one table of rows.
export function createStore(key, seed = []) {
  const read = () => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      /* unreadable data: fall back to the seed */
    }
    localStorage.setItem(key, JSON.stringify(seed));
    return seed;
  };
  const write = (rows) => localStorage.setItem(key, JSON.stringify(rows));

  return {
    all: read,
    get: (id) => read().find((r) => r.id === id) ?? null,
    create: (data) => {
      const row = { ...data, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
      write([row, ...read()]);
      return row;
    },
    update: (id, data) => write(read().map((r) => (r.id === id ? { ...r, ...data, id } : r))),
    remove: (id) => write(read().filter((r) => r.id !== id)),
    replaceAll: (rows) => write(rows), // used when drag-and-drop reorders the whole list
  };
}
