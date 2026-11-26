import { NavLink, Link, useLocation } from "react-router-dom";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const link = ({ isActive }) =>
  `border-b-2 py-1 hover:opacity-60 ${label} ${isActive ? "border-ink" : "border-transparent"}`;

export default function Navbar() {
  // Create / import / monster pages live under the Bestiary, so keep its tab lit there.
  const inBestiary = /^\/(bestiary|import|monsters)/.test(useLocation().pathname);
  return (
    <div className="bg-blood-deep/95">
    <header className="relative z-10">
      <nav className="grid items-center gap-y-4 px-6 py-6 sm:px-10 lg:grid-cols-[1fr_auto_1fr] 2xl:px-16">
        <Link to="/" className="font-display text-2xl leading-none max-lg:text-center">D&D DM KIT</Link>

        <div className="flex flex-wrap justify-center gap-x-7 gap-y-2">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/bestiary" className={({ isActive }) => link({ isActive: isActive || inBestiary })}>Bestiary</NavLink>
          <NavLink to="/campaigns" className={link}>Combat</NavLink>
          <NavLink to="/players" className={link}>Players</NavLink>
          <NavLink to="/npcs" className={link}>NPCs</NavLink>
          <NavLink to="/items" className={link}>Items</NavLink>
          <NavLink to="/lore" className={link}>Lore</NavLink>
          <NavLink to="/rules" className={link}>DM Screen</NavLink>
          <NavLink to="/backup" className={link}>Backup</NavLink>
        </div>
      </nav>
    </header>
    </div>
  );
}
