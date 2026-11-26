import { createStore } from "./storage.js";

// Table 7: lore (cities, towns, dungeons and other places in your story)
//   { id, name, kind, region, ruler, description, history, secrets, image?, campaignId?, createdAt }
//   image is a small JPEG data URL (see utils/image.js), so it travels with backups automatically.
export const loreStore = createStore("mb:lore");
