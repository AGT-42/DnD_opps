import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import NotFound from "./NotFound.jsx";
import Spotlight from "../components/Spotlight.jsx";
import HealthTracker from "../components/HealthTracker.jsx";
import SpellSlotTracker from "../components/SpellSlotTracker.jsx";
import { monsterStore } from "../services/monsterStore.js";
import { downloadStatBlock } from "../utils/exportStatBlock.js";

const btn = "px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.18em]";

export default function MonsterProfile() {
  const { id } = useParams(); // dynamic route: /monsters/:id
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const m = monsterStore.get(id);

  if (!m) return <NotFound />;

  const handleDelete = () => {
    if (!window.confirm(`Delete ${m.name}?`)) return;
    monsterStore.remove(id);
    navigate("/bestiary");
  };

  const handleSaveImage = async () => {
    setSaving(true);
    try {
      await downloadStatBlock(m);
    } catch {
      window.alert("Couldn't create the image. Please try again.");
    }
    setSaving(false);
  };

  return (
    <Spotlight
      monster={m}
      detailed
      hpSlot={
        <>
          <HealthTracker key={m.id} scope="solo" monsterId={m.id} maxHp={m.hp} />
          <SpellSlotTracker key={`${m.id}:${(m.spellSlots || []).join(",")}`} scope="solo" monsterId={m.id} slots={m.spellSlots} />
        </>
      }
      footer={
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button onClick={handleSaveImage} disabled={saving} className={`bg-ink text-paper hover:bg-blood disabled:opacity-50 ${btn}`}>
            {saving ? "Saving..." : "Save as image"}
          </button>
          <Link to={`/monsters/${id}/edit`} className={`bg-blood text-white hover:brightness-110 ${btn}`}>Edit</Link>
          <button onClick={handleDelete} className={`border border-ink hover:bg-ink hover:text-paper ${btn}`}>Delete</button>
          <Link to="/bestiary" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-mute hover:text-ink">Back to bestiary</Link>
        </div>
      }
    />
  );
}
