import { readFile } from 'node:fs/promises';
const source = await readFile('public/app.js', 'utf8');
if (/console\.log\s*\(/.test(source)) throw new Error('Unexpected console.log in production app.');
console.log('lint: static production checks passed');
