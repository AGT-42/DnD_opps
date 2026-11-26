import { useEffect, useState } from "react";
import { fetchSpell } from "../services/dndApi.js";
import { useSpellSlots } from "../services/useSpellSlots.js";
import { casterStats, diceAverage, ordinal, parseSpellcasting, rollDice, slotsFor, spellIndex, spellRolls } from "../utils/spells.js";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const cache = new Map(); // spell id -> spell data, so each spell is only fetched once per visit

// The red box: everything the DM needs to roll for this spell, already worked out.
function RollBox({ rolls, level }) {
  const [results, setResults] = useState({}); // { damage, heal }: what the Roll buttons last produced
  const row = "flex flex-wrap items-baseline gap-x-2";
  const rollBtn = "border border-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] hover:bg-white/15";
  // Rolls `dice` `count` times (a separate roll per magic missile dart or scorching ray).
  const roll = (kind, dice, count) => {
    const hits = Array.from({ length: count }, () => rollDice(dice));
    setResults((r) => ({ ...r, [kind]: { total: hits.reduce((n, h) => n + h.total, 0), hits } }));
  };
  const outcome = (r) =>
    r && (
      <p className="w-full text-sm">
        <span className="text-lg font-bold">= {r.total}</span>{" "}
        <span className="text-white/85">({r.hits.map((h) => h.text).join(" | ")})</span>
      </p>
    );
  const avg = (dice, count) => Math.round(diceAverage(dice) * count * 10) / 10;
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
        <>
          <p className={row}>
            <span className={key}>Damage</span>
            <span className="text-lg font-bold">{rolls.damage}</span>
            {rolls.damageDice && <span className="text-sm text-white/85">· avg {avg(rolls.damageDice, rolls.damageCount)}</span>}
            {rolls.damageDice && <button type="button" onClick={() => roll("damage", rolls.damageDice, rolls.damageCount)} className={`ml-auto ${rollBtn}`}>{results.damage ? "Reroll" : "Roll"}</button>}
          </p>
          {outcome(results.damage)}
        </>
      )}
      {rolls.heal && (
        <>
          <p className={row}>
            <span className={key}>Healing</span>
            <span className="text-lg font-bold">{rolls.heal}</span>
            <span className="text-sm text-white/85">· avg {avg(rolls.healDice, 1)}</span>
            <button type="button" onClick={() => roll("heal", rolls.healDice, 1)} className={`ml-auto ${rollBtn}`}>{results.heal ? "Reroll" : "Roll"}</button>
          </p>
          {outcome(results.heal)}
        </>
      )}
      {rolls.area && <p className="text-sm text-white/85">Area: {rolls.area}</p>}
    </div>
  );
}

function SpellDetail({ name, level, monster, max, used, onCast }) {
  const [castLevel, setCastLevel] = useState(level); // slot level it is cast with (can be higher than the spell's own)
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
  const rolls = spellRolls(spell, castLevel, monster);
  const left = (l) => max[l - 1] - used[l - 1];
  const remaining = castLevel > 0 ? left(castLevel) : 0;
  // Slot levels it can be cast at: its own level and up, wherever this creature has slots.
  const base = Math.max(1, Math.min(level, spell?.level ?? level));
  const castLevels = Array.from({ length: 10 - base }, (_, i) => base + i).filter((l) => max[l - 1] > 0 || l === level);
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
      {level > 0 && castLevels.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`${label} text-mute`}>Cast at</span>
          {castLevels.map((l) => (
            <button
              key={l}
              type="button"
              aria-pressed={castLevel === l}
              onClick={() => setCastLevel(l)}
              title={`${ordinal(l)}-level slot, ${left(l)} left`}
              className={`h-9 min-w-11 border px-2 ${label} ${castLevel === l ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-blood hover:text-blood"}`}
            >
              {ordinal(l)}
            </button>
          ))}
        </div>
      )}
      {rolls && <RollBox key={`${name}:${castLevel}`} rolls={rolls} level={castLevel} />}
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
          onClick={() => onCast(castLevel - 1)}
          disabled={remaining <= 0}
          className={`bg-blood px-4 py-2 text-white hover:brightness-110 disabled:opacity-40 ${label}`}
        >
          {remaining > 0 ? `Cast (uses a ${ordinal(castLevel)}-level slot, ${remaining} left)` : `No ${ordinal(castLevel)}-level slots left`}
        </button>
      )}
    </div>
  );
}

// Lists the monster's spells as buttons. Click one to read what it does and cast it,
// which spends a slot (the Spell slots tracker updates at the same time).
// With `collapsible`, the spells hide behind a single button (used on the small campaign cards).
export default function SpellBook({ scope, monster: m, className = "mt-8", collapsible = false }) {
  const groups = parseSpellcasting(m.description);
  const { max, used, spend } = useSpellSlots(scope, m.id, slotsFor(m));
  const [selected, setSelected] = useState(null); // { name, level }
  const [open, setOpen] = useState(false);

  if (groups.length === 0) return null;

  const total = groups.reduce((n, g) => n + g.spells.length, 0);

  return (
    <div className={className}>
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className={`flex w-full items-center justify-between border border-line px-4 py-2 text-ink hover:bg-ink hover:text-paper ${label}`}
        >
          <span>{open ? "Hide spells" : "View spells"} ({total})</span>
          <span aria-hidden>{open ? "▴" : "▾"}</span>
        </button>
      ) : (
        <p className={`${label} text-blood`}>Spells</p>
      )}
      {(!collapsible || open) && <p className="mt-3 text-sm text-mute">Click a spell to see what it does and cast it.</p>}
      <div className={`mt-3 space-y-4 ${collapsible && !open ? "hidden" : ""}`}>
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
                  max={max}
                  used={used}
                  onCast={spend}
                />
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}
