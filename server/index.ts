import { resolve } from 'node:path';
import { createApp } from './app.js';
import { JsonStore } from './dataStore.js';

const port = Number(process.env.PORT ?? 4173);
const databasePath = process.env.ASCEND_DB_PATH ?? resolve(process.cwd(), 'data/ascend.json');
const app = createApp({
  store: new JsonStore(databasePath),
  serveStatic: process.env.NODE_ENV === 'production',
});

app.listen(port, () => {
  console.log(`Ascend API listening on http://localhost:${port}`);
});
