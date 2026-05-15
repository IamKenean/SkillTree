import fs from "node:fs";
import path from "node:path";
import { Store } from "./types.js";

const dataDir = path.resolve(process.cwd(), "data");
const dataPath = path.join(dataDir, "store.json");

const initialStore: Store = {
  users: [],
  goals: [],
  nodes: [],
  progressEntries: [],
  achievements: [],
};

export const getInitialStore = (): Store => ({
  users: [],
  goals: [],
  nodes: [],
  progressEntries: [],
  achievements: [],
});

const ensureStore = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dataPath)) {
    fs.writeFileSync(dataPath, JSON.stringify(initialStore, null, 2));
  }
};

export const readStore = (): Store => {
  ensureStore();
  const raw = fs.readFileSync(dataPath, "utf-8");
  return JSON.parse(raw) as Store;
};

export const writeStore = (store: Store) => {
  ensureStore();
  fs.writeFileSync(dataPath, JSON.stringify(store, null, 2));
};

export const resetStore = () => {
  writeStore(getInitialStore());
};

export const withStore = <T>(mutator: (store: Store) => T): T => {
  const store = readStore();
  const result = mutator(store);
  writeStore(store);
  return result;
};
