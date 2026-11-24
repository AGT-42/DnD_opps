// Remembers how many spell slots each monster has USED, in this browser's localStorage.
// `scope` keeps slots separate per place it's tracked (same idea as hpStore.js).
const KEY = "mb:slots";

const read = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? {};
  } catch {
    return {};
  }
};

const slot = (scope, monsterId) => `${scope}:${monsterId}`;

// Returns an array of 9 numbers: slots used at levels 1-9.
export const getUsed = (scope, monsterId) => {
  const saved = read()[slot(scope, monsterId)];
  return Array.isArray(saved) ? saved : [];
};

export const setUsed = (scope, monsterId, used) =>
  localStorage.setItem(KEY, JSON.stringify({ ...read(), [slot(scope, monsterId)]: used }));
