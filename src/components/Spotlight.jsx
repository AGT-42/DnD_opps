import { ABILITIES, modifier } from "../utils/constants.js";
import { isSpellLine } from "../utils/spells.js";

const lines = (text = "") => text.split("\n").filter(Boolean);
const splitEntry = (line) => {
  const i = line.indexOf(". ");
  return i === -1 ? { name: line, desc: "" } : { name: line.slice(0, i), desc: line.slice(i + 2) };
};

function Label({ children, light }) {
  return (
    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${light ? "text-white/75" : "text-blood"}`}>
      {children}
    </p>
  );
}

// Left: name + next card. Middle (red column): the numbers. Right: description + actions.
export default function Spotlight({ monster: m, next, onNext, total = 0, index = 0, onSelect, footer, hpSlot, spellsSlot, detailed = false }) {
  const actions = lines(m.actions).map(splitEntry);
  const shownActions = detailed ? actions : actions.slice(0, 3);
  const bonusActions = lines(m.bonusActions).map(splitEntry);
  const shownBonus = detailed ? bonusActions : bonusActions.slice(0, 2);
  // when a spell list is shown, leave the raw "1st level (4 slots): ..." lines out of the description
  const desc = lines(m.description).filter((l) => !(spellsSlot && isSpellLine(l)));
  const shownDesc = detailed ? desc : desc.slice(0, 1);
  const longestWord = Math.max(...m.name.split(/\s+/).map((w) => w.length));


  return (
    <>
      {/* Red column behind the whole card, aligned with the middle grid track */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 hidden w-[min(28rem,45vw)] -translate-x-1/2 bg-blood md:block" />

      <div className="relative grid min-h-34 md:grid-cols-[minmax(0,1fr)_min(28rem,45vw)_minmax(0,1fr)]">
        {/* Left */}
        <div style={{ containerType: "inline-size" }} className="flex flex-col justify-center py-8 md:py-16 md:pr-10">
          {/* Picture above the name. Its width follows the column width (min 8rem, max 16rem), so it scales with the screen. */}
          {detailed && m.image && (
            <img
              src={m.image}
              alt={m.name}
              draggable={false}
              className="mb-6 aspect-square border-[6px] border-blood object-cover"
              style={{ width: "clamp(8rem, 55cqw, 16rem)" }}
            />
          )}
        <h1
  className="font-display leading-none text-balance"
  style={{ fontSize: `clamp(1.5rem, calc(100cqw / ${longestWord * 0.74}), 3.5rem)` }}
>
  {m.name}
</h1>
          <p className="mt-2 text-lg text-blood">{m.size} {m.type.toLowerCase()}</p>

          {next && (
            <button
              onClick={onNext}
              className="mt-12 flex w-72 max-w-full items-stretch bg-white text-left shadow-[0_14px_30px_-12px_rgba(0,0,0,0.35)] hover:-translate-y-0.5"
            >
              <span className="flex h-20 w-20 shrink-0 items-center justify-center bg-blood font-display text-4xl text-white">
                {next.name[0]}
              </span>
              <span className="flex min-w-0 flex-col justify-center px-5">
                <Label>Next</Label>
                <span className="truncate font-display text-lg">{next.name}</span>
              </span>
            </button>
          )}

          {total > 1 && (
            <div className="mt-6 flex gap-3 pl-1">
              {Array.from({ length: total }, (_, i) => (
                <button
                  key={i}
                  onClick={() => onSelect(i)}
                  aria-label={`Show monster ${i + 1}`}
                  className={`h-3.5 w-3.5 rotate-45 border ${i === index ? "border-blood bg-blood" : "border-ink/40"}`}
                />
              ))}
            </div>
          )}

          {footer}
        </div>

        {/* Middle: stats on the red column */}
        <div className="flex flex-col items-center justify-center gap-6 bg-blood px-6 py-12 text-white md:bg-transparent">
          {[["Armor class", m.ac], ["Hit points", m.hp], ["Challenge", m.cr]].map(([name, value]) =>
            name === "Hit points" && hpSlot ? (
              <div key={name} className="w-full">{hpSlot}</div>
            ) : (
              <div key={name} className="text-center">
                <Label light>{name}</Label>
                <p className="font-display text-6xl leading-none">{value}</p>
              </div>
            )
          )}
          {detailed && (
            <>
              <div className="text-center">
                <Label light>Speed</Label>
                <p className="text-lg">{m.speed}</p>
              </div>
              <dl className="grid grid-cols-3 gap-x-6 gap-y-3 border-t border-white/30 pt-5 text-center">
                {ABILITIES.map((a) => (
                  <div key={a}>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/75">{a}</dt>
                    <dd className="font-display text-xl">
                      {m[a]} <span className="text-sm text-white/75">({modifier(m[a])})</span>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </div>

        {/* Right */}
        <div className="flex flex-col justify-center py-8 md:py-16 md:pl-10">
          <div className="space-y-3 text-sm leading-relaxed text-mute">
            {shownDesc.map((line, i) => (
              <p key={i} className={detailed ? "" : "line-clamp-6"}>{line}</p>
            ))}
          </div>

          <div className="mt-8 space-y-6">
            {shownActions.length === 0 && <p className="text-sm text-mute">No actions recorded.</p>}
            {shownActions.map((a, i) => (
              <div key={i}>
                <Label>Action</Label>
                <p className="line-clamp-2 font-display text-2xl leading-tight">{a.name}</p>
                {detailed && a.desc && <p className="mt-1 text-sm leading-relaxed text-mute">{a.desc}</p>}
              </div>
            ))}
            {shownBonus.map((a, i) => (
              <div key={`bonus-${i}`}>
                <Label>Bonus action</Label>
                <p className="line-clamp-2 font-display text-2xl leading-tight">{a.name}</p>
                {detailed && a.desc && <p className="mt-1 text-sm leading-relaxed text-mute">{a.desc}</p>}
              </div>
            ))}
          </div>

          {spellsSlot}
        </div>
      </div>
    </>
  );
}
