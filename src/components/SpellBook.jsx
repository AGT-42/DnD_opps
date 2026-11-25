import { useEffect, useState } from "react";
import { fetchSpell } from "../services/dndApi.js";
import { useSpellSlots } from "../services/useSpellSlots.js";
import { casterStats, ordinal, parseSpellcasting, slotsFor, spellIndex, spellRolls } from "../utils/spells.js";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const cache = new Map(); // spell id -> spell data, so each spell is only fetched once per visit

// The red box: everything the DM needs to roll for this spell, already worked out.
function RollBox({ rolls, level }) {
  const row = "flex flex-wrap items-baseline gap-x-2";
  const key = "w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75";
  return (
    <div className="space-y-1.5 bg-blood px-4 py-3 text-white" role="note" aria-label="Rolls for this spell">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">
        Roll this{level > 0 ? ` (cast at ${ordinal(level)} level)` : ""}
      </p>
      {rolls.attack && (
        <p className={row}><span className={key}>To hit</span><span className="text-lg font-bold">d20 {rolls.attack}</span></p>
      )}
      {rolls.save && (
        <p className={row}>
          <span className={key}>Save</span>
          <span className="text-lg font-bold">DC {rolls.save.dc}{rolls.save.ability ? ` ${rolls.save.ability}` : ""}</span>
          {rolls.save.onSuccess && <span className="text-sm text-white/85">· {rolls.save.onSuccess}</span>}
        </p>
      )}
      {rolls.damage && (
        <p className={row}><span className={key}>Damage</span><span className="text-lg font-bold">{rolls.damage}</span></p>
      )}
      {rolls.heal && (
        <p className={row}><span className={key}>Healing</span><span className="text-lg font-bold">{rolls.heal}</span></p>
      )}
      {rolls.area && <p className="text-sm text-white/85">Area: {rolls.area}</p>}
    </div>
  );
}

function SpellDetail({ name, level, monster, remaining, onCast }) {
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
  const rolls = spellRolls(spell, level, monster);
  const caster = casterStats(monster);
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
      {rolls && <RollBox rolls={rolls} level={level} />}
      {state.status === "loading" && <p className="text-mute">Loading spell...</p>}
      {state.status === "error" && (
        <>
          <p className="text-mute">Couldn't load this spell from the D&D API (it may not be in the SRD, or you're offline).</p>
          <p className="bg-blood px-4 py-3 text-white">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">Its numbers </span>
            Spell attack d20 {caster.attack >= 0 ? `+${caster.attack}` : caster.attack} · Save DC {caster.dc}
          </p>
        </>
      )}
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
                  monster={m}
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
