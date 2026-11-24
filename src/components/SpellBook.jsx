import { useEffect, useState } from "react";
import { fetchSpell } from "../services/dndApi.js";
import { useSpellSlots } from "../services/useSpellSlots.js";
import { ordinal, parseSpellcasting, slotsFor, spellIndex } from "../utils/spells.js";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const cache = new Map(); // spell id -> spell data, so each spell is only fetched once per visit

function SpellDetail({ name, level, remaining, onCast }) {
  const id = spellIndex(name);
  const [state, setState] = useState(() => (cache.has(id) ? { status: "ok", spell: cache.get(id) } : { status: "loading" }));

  useEffect(() => {
    if (cache.has(id)) return;
    let cancelled = false;
    fetchSpell(id)
      .then((spell) => {
        cache.set(id, spell);
        if (!cancelled) setState({ status: "ok", spell });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { spell } = state;
  const meta = spell
    ? [
        spell.level === 0 ? `Cantrip` : `${ordinal(spell.level)}-level`,
        spell.school?.name,
        spell.concentration ? "concentration" : null,
        spell.ritual ? "ritual" : null,
      ].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="mt-3 space-y-2 border border-line bg-white p-4 text-sm leading-relaxed">
      <p className="font-display text-xl leading-tight text-ink">{name}</p>
      {state.status === "loading" && <p className="text-mute">Loading spell...</p>}
      {state.status === "error" && <p className="text-mute">Couldn't load this spell from the D&D API (it may not be in the SRD, or you're offline).</p>}
      {spell && (
        <>
          <p className={`${label} text-blood`}>{meta}</p>
          <p className="text-mute">
            <span className="text-ink">Cast:</span> {spell.casting_time} · <span className="text-ink">Range:</span> {spell.range} ·{" "}
            <span className="text-ink">Duration:</span> {spell.duration}
            {spell.components?.length ? <> · <span className="text-ink">Components:</span> {spell.components.join(", ")}</> : null}
          </p>
          {spell.desc?.map((p, i) => <p key={i} className="text-mute">{p}</p>)}
          {spell.higher_level?.length > 0 && (
            <p className="text-mute"><span className="text-ink">At higher levels.</span> {spell.higher_level.join(" ")}</p>
          )}
        </>
      )}

      {level === 0 ? (
        <p className={`${label} text-mute`}>Cantrip: at will, no slot used</p>
      ) : (
        <button
          type="button"
          onClick={onCast}
          disabled={remaining <= 0}
          className={`bg-blood px-4 py-2 text-white hover:brightness-110 disabled:opacity-40 ${label}`}
        >
          {remaining > 0 ? `Cast (uses a ${ordinal(level)}-level slot, ${remaining} left)` : `No ${ordinal(level)}-level slots left`}
        </button>
      )}
    </div>
  );
}

// Lists the monster's spells as buttons. Click one to read what it does and cast it,
// which spends a slot (the Spell slots tracker updates at the same time).
export default function SpellBook({ scope, monster: m, className = "mt-8" }) {
  const groups = parseSpellcasting(m.description);
  const { max, used, spend } = useSpellSlots(scope, m.id, slotsFor(m));
  const [selected, setSelected] = useState(null); // { name, level }

  if (groups.length === 0) return null;

  return (
    <div className={className}>
      <p className={`${label} text-blood`}>Spells</p>
      <p className="mt-1 text-sm text-mute">Click a spell to see what it does and cast it.</p>
      <div className="mt-3 space-y-4">
        {groups.map((g) => {
          const left = g.level > 0 ? max[g.level - 1] - used[g.level - 1] : null;
          return (
            <div key={g.level}>
              <p className="text-sm text-mute">
                {g.level === 0 ? "Cantrips (at will)" : `${ordinal(g.level)} level`}
                {left !== null && max[g.level - 1] > 0 && <span className="text-ink"> · {left}/{max[g.level - 1]} slots left</span>}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {g.spells.map((name) => {
                  const active = selected?.name === name && selected?.level === g.level;
                  return (
                    <button
                      key={name}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setSelected(active ? null : { name, level: g.level })}
                      className={`border px-3 py-1 text-sm capitalize ${active ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-blood hover:text-blood"}`}
                    >
                      {name}
                    </button>
                  );
                })}
              </div>

              {selected?.level === g.level && (
                <SpellDetail
                  key={selected.name}
                  name={selected.name}
                  level={g.level}
                  remaining={g.level > 0 ? max[g.level - 1] - used[g.level - 1] : 0}
                  onCast={() => spend(g.level - 1)}
                />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
