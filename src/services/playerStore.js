import { createStore } from "./storage.js";

// Table 6: players
//   { id, name, playerName, race, charClass, level, notes, campaignId?, createdAt,
//     affiliations: [{ key, npcId, relation }],
//     inventory:    [{ key, itemId, qty }] }
const store = createStore("mb:players");

const newKey = () => crypto.randomUUID();
const withLists = (p) => ({ ...p, affiliations: p.affiliations ?? [], inventory: p.inventory ?? [] });

const all = () => store.all().map(withLists);

export const playerStore = {
  ...store,
  all,
  get: (id) => all().find((p) => p.id === id) ?? null,

  // Hands an item to a player. Giving the same item again just raises the quantity.
  giveItem: (playerId, itemId, qty = 1) => {
    const p = all().find((x) => x.id === playerId);
    if (!p) return;
    const amount = Math.max(1, Number(qty) || 1);
    const has = p.inventory.some((row) => row.itemId === itemId);
    const inventory = has
      ? p.inventory.map((row) => (row.itemId === itemId ? { ...row, qty: row.qty + amount } : row))
      : [...p.inventory, { key: newKey(), itemId, qty: amount }];
    store.update(playerId, { inventory });
  },

  // Several items at once: itemIds is a list, every one goes to the player.
  giveItems: (playerId, itemIds, qty = 1) => itemIds.forEach((id) => playerStore.giveItem(playerId, id, qty)),

  addAffiliations: (playerId, npcIds, relation) => npcIds.forEach((id) => playerStore.addAffiliation(playerId, id, relation)),

  // When a campaign is deleted, its players simply become ungrouped.
  forgetCampaign: (campaignId) =>
    all().forEach((p) => {
      if (p.campaignId === campaignId) store.update(p.id, { campaignId: "" });
    }),

  addAffiliation: (playerId, npcId, relation) => {
    const p = all().find((x) => x.id === playerId);
    if (!p || p.affiliations.some((a) => a.npcId === npcId)) return;
    store.update(playerId, { affiliations: [...p.affiliations, { key: newKey(), npcId, relation }] });
  },

  // When an NPC or item is deleted, take it off every player so nothing points at a ghost.
  forgetNpc: (npcId) =>
    all().forEach((p) => {
      if (p.affiliations.some((a) => a.npcId === npcId)) {
        store.update(p.id, { affiliations: p.affiliations.filter((a) => a.npcId !== npcId) });
      }
    }),
  forgetItem: (itemId) =>
    all().forEach((p) => {
      if (p.inventory.some((row) => row.itemId === itemId)) {
        store.update(p.id, { inventory: p.inventory.filter((row) => row.itemId !== itemId) });
      }
    }),
};
