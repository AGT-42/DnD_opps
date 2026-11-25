import { useState } from "react";

// Search box + checkable results, for picking several things at once.
// options: [{ id, name, sub? }]   selected: [id]   onChange(nextSelectedIds)
export default function SearchPicker({ options, selected, onChange, placeholder = "Search...", emptyText = "Nothing found." }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const matches = options
    .filter((o) => !q || `${o.name} ${o.sub ?? ""}`.toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 40);

  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="border border-line bg-white">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full border-b border-line px-3 py-2 text-sm text-ink outline-none"
      />
      <ul className="max-h-44 overflow-y-auto">
        {matches.length === 0 && <li className="px-3 py-2 text-sm text-mute">{emptyText}</li>}
        {matches.map((o) => (
          <li key={o.id}>
            <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm hover:bg-paper">
              <input type="checkbox" checked={selected.includes(o.id)} onChange={() => toggle(o.id)} className="h-4 w-4 accent-blood" />
              <span className="min-w-0 flex-1 truncate text-ink">{o.name}</span>
              {o.sub && <span className="shrink-0 text-xs text-mute">{o.sub}</span>}
            </label>
          </li>
        ))}
      </ul>
      {options.length > 40 && !q && <p className="border-t border-line px-3 py-1 text-xs text-mute">Showing 40 of {options.length}. Type to narrow down.</p>}
    </div>
  );
}
