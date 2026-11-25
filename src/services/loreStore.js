import { createStore } from "./storage.js";

// Table 7: lore (cities, towns, dungeons and other places in your story)
//   { id, name, kind, region, ruler, description, history, secrets, campaignId?, createdAt }
export const loreStore = createStore("mb:lore");
