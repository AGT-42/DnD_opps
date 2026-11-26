import { useLayoutEffect, useRef, useState } from "react";
import HealthTracker from "./HealthTracker.jsx";
import SpellSlotTracker from "./SpellSlotTracker.jsx";
import SpellBook from "./SpellBook.jsx";
import DragGrip from "./DragGrip.jsx";
import { ABILITIES, modifier } from "../utils/constants.js";
import { isSpellLine, slotsFor } from "../utils/spells.js";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const lines = (text = "") => text.split("\n").filter(Boolean);
const splitEntry = (line) => {
  const i = line.indexOf(". ");
  return i === -1 ? { name: line, desc: "" } : { name: line.slice(0, i), desc: line.slice(i + 2) };
};
const step = "flex h-7 w-7 items-center justify-center bg-white/20 text-lg leading-none hover:bg-white/35 disabled:opacity-30";
// Status conditions you can put on a creature (5e rules), with a short reminder shown on hover.
const CONDITIONS = {
  Blinded: "Can't see. Auto-fails sight checks. Attacks against it have advantage; its attacks have disadvantage.",
  Charmed: "Can't attack the charmer or target them with harmful effects. Charmer has advantage on social checks.",
  Deafened: "Can't hear. Auto-fails hearing checks.",
  Frightened: "Disadvantage on checks and attacks while the source is in sight. Can't willingly move closer to it.",
  Grappled: "Speed is 0. Ends if the grappler is incapacitated or it is moved out of reach.",
  Incapacitated: "Can't take actions or reactions.",
  Invisible: "Can't be seen without help. Attacks against it have disadvantage; its attacks have advantage.",
  Paralyzed: "Incapacitated, can't move or speak. Fails Str/Dex saves. Attacks have advantage; melee hits within 5 ft are crits.",
  Petrified: "Turned to stone. Incapacitated, unaware, resistant to all damage, immune to poison and disease.",
  Poisoned: "Disadvantage on attack rolls and ability checks.",
  Prone: "Can only crawl. Disadvantage on attacks. Melee attacks against it have advantage, ranged have disadvantage.",
  Restrained: "Speed is 0. Attacks against it have advantage; its attacks and Dex saves have disadvantage.",
  Stunned: "Incapacitated, can't move, speaks falteringly. Fails Str/Dex saves. Attacks against it have advantage.",
  Unconscious: "Incapacitated, prone, drops what it holds. Fails Str/Dex saves. Melee hits within 5 ft are crits.",
  Exhaustion: "Levels of exhaustion. Name the level yourself with Custom, e.g. Exhaustion 2.",
  Concentrating: "Maintaining a spell. Needs a Constitution save when damaged or the spell ends.",
};
const COLLAPSED_REM = 20; // the abilities/description/actions block is cut off after this many rem

// A complete, self-contained stat block for ONE creature: numbers, live HP, abilities, traits and every attack.
// `scope` keeps this creature's HP separate from every other creature (even duplicates of the same monster).
export default function StatBlockCard({
  monster: m, name, scope, baseCr, active, initiative, inCombat, dragging, dropTarget,
  conditions = [], onConditionsChange,
  onRename, onDuplicate, onRemove, onCrStep, onCrReset, onToggleCombat,
  gripProps, dropProps,
}) {
  const [renaming, setRenaming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const bodyRef = useRef(null);
  const actions = lines(m.actions).map(splitEntry);
  const bonusActions = lines(m.bonusActions).map(splitEntry);
  const desc = lines(m.description).filter((l) => !isSpellLine(l)); // spell lines are shown by the spell list below
  const changed = baseCr !== m.cr;

  // Only offer "See more" if the details block is actually taller than the cut-off.
  useLayoutEffect(() => {
    const el = bodyRef.current;
    const check = () => {
      const limit = parseFloat(getComputedStyle(document.documentElement).fontSize) * COLLAPSED_REM;
      setOverflows(el.scrollHeight > limit + 8);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [m]);

  const cut = overflows && !expanded;

  return (
    <article
      {...dropProps}
      data-drag-image
      className={`flex flex-col border bg-white shadow-[0_18px_40px_-24px_rgba(0,0,0,0.35)] ${
        active ? "border-ink outline outline-4 outline-ink" : dropTarget ? "border-blood outline-dashed outline-4 outline-blood" : "border-line"
      } ${dragging ? "opacity-40" : ""}`}
    >
      {/* Grab bar: drag this to move the card */}
      <DragGrip gripProps={gripProps} />

      <header className="px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          {renaming ? (
            <input
              autoFocus
              defaultValue={name}
              aria-label="Creature name"
              onBlur={(e) => { onRename(e.target.value.trim()); setRenaming(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setRenaming(false); }}
              className="min-w-0 flex-1 border border-line px-2 py-1 font-display text-2xl text-ink"
            />
          ) : (
            <h3 className="font-display text-3xl leading-tight text-ink">{name}</h3>
          )}
          {(active || (initiative !== undefined && initiative !== "")) && (
            <span className={`shrink-0 px-2 py-1 ${label} ${active ? "bg-ink text-paper" : "border border-line text-mute"}`}>
              {active ? "Turn" : `Init ${initiative}`}
            </span>
          )}
        </div>
        <p className="text-blood">{m.size} {m.type.toLowerCase()}</p>

        {/* Status conditions: tap a chip's x to clear it */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {conditions.map((c) => (
            <span key={c} title={CONDITIONS[c] ?? "Custom condition"} className={`inline-flex items-center gap-1 bg-ink py-1 pl-2.5 pr-1 text-paper ${label}`}>
              {c}
              <button
                onClick={() => onConditionsChange(conditions.filter((x) => x !== c))}
                aria-label={`Remove ${c}`}
                className="flex h-6 w-6 items-center justify-center text-base leading-none hover:bg-white/20"
              >
                ×
              </button>
            </span>
          ))}
          <select
            value=""
            aria-label="Add a status condition"
            onChange={(e) => {
              let next = e.target.value;
              if (next === "__custom") next = (window.prompt("Condition name (e.g. Exhaustion 2, Hexed, Bleeding)") ?? "").trim();
              if (next && !conditions.includes(next)) onConditionsChange([...conditions, next]);
            }}
            className={`h-8 border border-dashed border-mute bg-white px-2 text-mute hover:border-blood hover:text-blood ${label}`}
          >
            <option value="">+ Condition</option>
            {Object.keys(CONDITIONS).filter((c) => !conditions.includes(c)).map((c) => <option key={c} value={c}>{c}</option>)}
            <option value="__custom">Custom…</option>
          </select>
        </div>
      </header>

      {/* Red panel: the numbers + health tracker */}
      <div className="space-y-5 bg-blood px-5 py-5 text-white">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <p className={`${label} text-white/75`}>Armor class</p>
            <p className="font-display text-4xl leading-none">{m.ac}</p>
          </div>
          <div>
            <p className={`${label} text-white/75`}>Challenge</p>
            <p className="font-display text-4xl leading-none">{m.cr}</p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <button onClick={() => onCrStep(-1)} aria-label="Lower challenge rating" className={step}>−</button>
              <button onClick={() => onCrStep(1)} aria-label="Raise challenge rating" className={step}>+</button>
            </div>
            {changed && (
              <button onClick={onCrReset} className={`mt-1 underline underline-offset-2 text-white/75 hover:text-white ${label}`}>Reset to {baseCr}</button>
            )}
          </div>
          <div>
            <p className={`${label} text-white/75`}>Speed</p>
            <p className="mt-1 text-base leading-tight">{m.speed}</p>
          </div>
        </div>
        <div className="border-t border-white/30 pt-5">
          <HealthTracker key={`${scope}:${m.id}:${m.hp}`} scope={scope} monsterId={m.id} maxHp={m.hp} />
          <SpellSlotTracker key={`${scope}:${m.id}:${slotsFor(m).join(",")}`} scope={scope} monsterId={m.id} slots={slotsFor(m)} />
        </div>
      </div>

      {/* Details: abilities, traits, actions. Long ones are cut off with "See more". */}
      <div className="px-5 pt-5">
        <div className="relative overflow-hidden" style={cut ? { maxHeight: `${COLLAPSED_REM}rem` } : undefined}>
          <div ref={bodyRef} className="space-y-5">
            <dl className="grid grid-cols-6 gap-2 text-center">
              {ABILITIES.map((a) => (
                <div key={a}>
                  <dt className={`${label} text-blood`}>{a}</dt>
                  <dd className="font-display text-lg leading-tight">{m[a]}</dd>
                  <dd className="text-xs text-mute">({modifier(m[a])})</dd>
                </div>
              ))}
            </dl>

            {desc.length > 0 && (
              <div className="space-y-2 text-sm leading-relaxed text-mute">
                {desc.map((line, i) => <p key={i}>{line}</p>)}
              </div>
            )}

            <div className="space-y-4 border-t border-line pt-5">
              <p className={`${label} text-blood`}>Actions</p>
              {actions.length === 0 && <p className="text-sm text-mute">No actions recorded.</p>}
              {actions.map((a, i) => (
                <div key={i}>
                  <p className="font-display text-lg leading-tight text-ink">{a.name}</p>
                  {a.desc && <p className="mt-1 text-sm leading-relaxed text-mute">{a.desc}</p>}
                </div>
              ))}
            </div>

            {bonusActions.length > 0 && (
              <div className="space-y-4 border-t border-line pt-5">
                <p className={`${label} text-blood`}>Bonus actions</p>
                {bonusActions.map((a, i) => (
                  <div key={i}>
                    <p className="font-display text-lg leading-tight text-ink">{a.name}</p>
                    {a.desc && <p className="mt-1 text-sm leading-relaxed text-mute">{a.desc}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
          {cut && <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-20" style={{ background: "linear-gradient(to top, #fff, rgba(255,255,255,0))" }} />}
        </div>
        {overflows && (
          <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className={`mt-3 w-full border border-line py-2 text-ink hover:bg-ink hover:text-paper ${label}`}>
            {expanded ? "See less" : "See more"}
          </button>
        )}

        <SpellBook scope={scope} monster={m} collapsible className="mt-5 border-t border-line pt-5" />
      </div>

      <footer className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line px-5 py-3">
        <button
          onClick={onToggleCombat}
          aria-pressed={inCombat}
          title={inCombat ? "In the initiative tracker. Click to take out of combat." : "Add to the initiative tracker"}
          className={`px-4 py-2 ${label} ${inCombat ? "bg-blood text-white hover:brightness-110" : "border border-blood text-blood hover:bg-blood hover:text-white"}`}
        >
          {inCombat ? "✓ Combat" : "Combat"}
        </button>
        <button onClick={onDuplicate} className={`hover:text-blood ${label}`}>Duplicate</button>
        <button onClick={() => setRenaming(true)} className={`hover:text-blood ${label}`}>Rename</button>
        <button onClick={onRemove} className={`ml-auto text-blood hover:underline ${label}`}>Remove</button>
      </footer>
    </article>
  );
}
