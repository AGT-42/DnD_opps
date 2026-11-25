import { NavLink, Link } from "react-router-dom";

const label = "text-[11px] font-semibold uppercase tracking-[0.18em]";
const link = ({ isActive }) =>
  `border-b-2 py-1 hover:opacity-60 ${label} ${isActive ? "border-ink" : "border-transparent"}`;
const cta = `bg-blood px-6 py-3 text-white shadow-[0_12px_24px_-10px_rgba(187,58,47,0.8)] hover:brightness-110 ${label}`;

export default function Navbar() {
  return (
    <header className="relative z-10">
      <nav className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 px-6 py-6 sm:px-10 2xl:px-16">
        <Link to="/" className="font-display text-2xl leading-none">D&D DM KIT</Link>

        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <NavLink to="/" end className={link}>Home</NavLink>
          <NavLink to="/bestiary" className={link}>Bestiary</NavLink>
          <NavLink to="/campaigns" className={link}>Combat</NavLink>
          <NavLink to="/players" className={link}>Players</NavLink>
          <NavLink to="/npcs" className={link}>NPCs</NavLink>
          <NavLink to="/items" className={link}>Items</NavLink>
          <NavLink to="/lore" className={link}>Lore</NavLink>
          <NavLink to="/rules" className={link}>DM Screen</NavLink>
          <NavLink to="/import" className={link}>Import Stats</NavLink>
          <NavLink to="/backup" className={link}>Backup</NavLink>
        </div>

        <Link to="/monsters/new" className={cta}>Create monster</Link>
      </nav>
    </header>
  );
}
