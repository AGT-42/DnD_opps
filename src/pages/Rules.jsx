const sections = [
  {
    title: "The core mechanic",
    intro: "When an action has a chance of failure, roll a d20 and add the relevant modifier.",
    rows: [["Ability check", "d20 + ability modifier + proficiency (if proficient)"], ["Attack roll", "d20 + attack bonus vs. target AC"], ["Saving throw", "d20 + save modifier vs. the effect's DC"]],
    note: "A natural 20 or 1 is not automatically a success or failure on ordinary ability checks and saving throws. Attack rolls have special critical-hit rules."
  },
  {
    title: "Difficulty classes",
    rows: [["Very easy", "DC 5"], ["Easy", "DC 10"], ["Moderate", "DC 15"], ["Hard", "DC 20"], ["Very hard", "DC 25"], ["Nearly impossible", "DC 30"]]
  },
  {
    title: "Ability scores",
    rows: [["Strength", "Lifting, breaking, climbing, melee power"], ["Dexterity", "Agility, stealth, reflexes, finesse"], ["Constitution", "Stamina, endurance, resisting harm"], ["Intelligence", "Memory, investigation, reasoning"], ["Wisdom", "Awareness, intuition, perception"], ["Charisma", "Confidence, persuasion, force of personality"]],
    note: "Ability modifier = floor((score − 10) ÷ 2)."
  },
  {
    title: "Combat round",
    rows: [["1. Start", "Resolve surprise and determine initiative."], ["2. Initiative", "Each creature rolls d20 + Dexterity modifier; highest acts first."], ["3. Turn", "Move up to your speed and take one action. Bonus actions and reactions are available only when a feature or rule grants them."], ["4. Repeat", "Continue in initiative order until combat ends."]]
  },
  {
    title: "Common actions",
    rows: [["Attack", "Make a weapon or unarmed attack."], ["Cast a spell", "Cast a spell with a casting time of 1 action."], ["Dash", "Gain extra movement equal to your speed."], ["Disengage", "Your movement doesn't provoke opportunity attacks for the rest of the turn."], ["Dodge", "Attacks against you have disadvantage if you can see the attacker; you make Dexterity saves with advantage until your next turn."], ["Help", "Give an ally assistance on an ability check or attack, as appropriate."], ["Hide", "Make a Dexterity (Stealth) check to hide."], ["Ready", "Choose a perceivable trigger and take a reaction when it happens."], ["Search / Use an object", "Look for something or interact with an object."]]
  },
  {
    title: "Attacks & defense",
    rows: [["Armor Class (AC)", "An attack hits if its total meets or beats the target's AC."], ["Advantage", "Roll two d20s and use the higher result."], ["Disadvantage", "Roll two d20s and use the lower result."], ["Cover", "Half cover: +2 AC and Dexterity saves. Three-quarters cover: +5. Total cover: cannot be targeted directly by many attacks and spells."], ["Critical hit", "A natural 20 on an attack roll hits and doubles the attack's damage dice."]]
  },
  {
    title: "Damage & falling unconscious",
    rows: [["Hit points", "Damage reduces HP. At 0 HP, a creature usually falls unconscious."], ["Healing", "Restoration of hit points can bring a creature back up."], ["Death saves", "At the start of your turn at 0 HP, roll a d20. 10+ is a success; 9 or less is a failure. Three successes stabilize you; three failures mean death."], ["Natural 20", "On a death save, regain 1 HP."], ["Natural 1", "On a death save, count as two failures."]]
  },
  {
    title: "Conditions quick reference",
    rows: [["Blinded", "Can't see; attacks against you have advantage, your attacks have disadvantage."], ["Charmed", "Can't attack the charmer or target them with harmful abilities; the charmer has advantage on social checks against you."], ["Frightened", "Disadvantage on ability checks and attacks while the source is in sight; can't willingly move closer to it."], ["Grappled", "Speed becomes 0."], ["Prone", "Crawl or spend movement to stand; melee attacks against you have advantage, ranged attacks have disadvantage."], ["Restrained", "Speed 0; attacks against you have advantage, your attacks and Dexterity saves have disadvantage."], ["Stunned", "Incapacitated, can't move, and can speak only falteringly; Strength and Dexterity saves fail."], ["Unconscious", "Incapacitated, can't move or speak, unaware; drops what it holds and falls prone. Attacks from nearby attackers have advantage and hits are critical."]]
  },
  {
    title: "Resting",
    rows: [["Short rest", "At least 1 hour of downtime. A character may spend Hit Dice to regain HP."], ["Long rest", "At least 8 hours of rest; characters generally regain all HP and recover spent Hit Dice according to the rules." ]],
    note: "Some class features, spells, and campaign rules change what a character recovers. Check the character's feature text."
  }
];

function RuleSection({ section, index }) {
  return (
    <section className="border border-line border-t-4 border-t-blood bg-white p-5 shadow-[0_18px_40px_-24px_rgba(0,0,0,0.3)]">
      <div className="mb-4 flex items-center gap-3 border-b border-line pb-3">
        <span className="font-display text-2xl text-blood">{String(index + 1).padStart(2, "0")}</span>
        <h2 className="font-display text-2xl text-ink">{section.title}</h2>
      </div>
      {section.intro && <p className="mb-3 text-sm text-mute">{section.intro}</p>}
      <dl className="space-y-3">
        {section.rows.map(([term, detail]) => (
          <div key={term} className="grid gap-1 sm:grid-cols-[minmax(7rem,0.7fr)_2fr] sm:gap-4">
            <dt className="text-sm font-bold text-ink">{term}</dt>
            <dd className="text-sm leading-relaxed text-mute">{detail}</dd>
          </div>
        ))}
      </dl>
      {section.note && <p className="mt-4 border-l-2 border-blood bg-paper px-3 py-2 text-sm text-mute">{section.note}</p>}
    </section>
  );
}

export default function Rules() {
  return (
    <section className="space-y-7">
      <header className="border-b-2 border-ink pb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blood">Dungeon Master reference</p>
        <h1 className="mt-2 font-display text-5xl text-ink">DM Screen</h1>
        <p className="mt-2 max-w-3xl text-mute">A quick-reference sheet for common D&D 5e rules. Use it at the table to keep checks, combat, conditions, and rests moving.</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
        {sections.map((section, index) => <RuleSection key={section.title} section={section} index={index} />)}
      </div>
      <p className="text-xs leading-relaxed text-mute">Quick reference only. Specific class features, spell descriptions, monster traits, and your table's chosen rules may override these general reminders. This page summarizes commonly used 5e rules and is not a replacement for the full rulebooks.</p>
    </section>
  );
}
