import { createStore } from "./storage.js";

// Table 4: npcs
//   { id, name, race, role, location, attitude, monsterId?, notes, createdAt }
//   monsterId (optional) points at a stat block in the bestiary.
export const npcStore = createStore("mb:npcs");
