import { readFile } from 'node:fs/promises';
const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
if (!Number.isInteger(lock.lockfileVersion) || lock.lockfileVersion < 1) throw new Error('package-lock.json must use lockfileVersion >= 1.');
if (lock.name !== packageJson.name) throw new Error('package-lock.json name does not match package.json.');
if (lock.packages?.['']?.version !== packageJson.version) throw new Error('package-lock.json root version does not match package.json.');
for (const file of ['pnpm-lock.yaml', 'yarn.lock']) { try { await readFile(file); throw new Error(`Do not mix npm with ${file}.`); } catch (error) { if (error.message.startsWith('Do not mix')) throw error; } }
console.log(`lockfile: npm lockfileVersion ${lock.lockfileVersion}, package metadata consistent`);
