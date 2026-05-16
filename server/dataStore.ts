import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { SkillTree } from '../src/shared/types.js';

export type UserRecord = {
  id: string;
  username: string;
  avatar: string;
  passwordHash: string;
  createdAt: string;
};

export type AscendDatabase = {
  users: UserRecord[];
  goals: Record<string, SkillTree[]>;
};

const emptyDatabase = (): AscendDatabase => ({
  users: [],
  goals: {},
});

export class JsonStore {
  constructor(private readonly path: string) {}

  async read(): Promise<AscendDatabase> {
    try {
      const raw = await readFile(this.path, 'utf-8');
      return JSON.parse(raw) as AscendDatabase;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      return emptyDatabase();
    }
  }

  async write(data: AscendDatabase): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(this.path, JSON.stringify(data, null, 2), 'utf-8');
  }

  async update<T>(handler: (data: AscendDatabase) => T | Promise<T>): Promise<T> {
    const data = await this.read();
    const result = await handler(data);
    await this.write(data);
    return result;
  }
}
