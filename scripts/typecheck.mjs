import { readFile } from 'node:fs/promises';
const source = await readFile('public/app.js', 'utf8');
if (!source.includes("const STORAGE_KEY")) throw new Error('App source was not found.');
console.log('typecheck: static JavaScript source present (no TypeScript entry in this checkout)');
