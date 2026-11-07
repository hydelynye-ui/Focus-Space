import { readFile } from 'node:fs/promises';
const app = await readFile('public/app.js', 'utf8');
const auth = await readFile('src/cloudbase/auth.js', 'utf8');
const config = await readFile('src/cloudbase/config.js', 'utf8');
for (const token of ['initializeAuthFlow', 'profileButton', 'logoutButton', 'getCurrentSession', 'onAuthStateChange']) if (!app.includes(token) && !auth.includes(token)) throw new Error(`Missing auth integration: ${token}`);
for (const token of ['signUpWithEmail', 'signInWithPassword', 'signInWithOtp', 'verifyOtp', 'signOut']) if (!auth.includes(token)) throw new Error(`Missing CloudBase auth operation: ${token}`);
if (app.includes('localStorage.clear(') || app.includes('indexedDB.deleteDatabase(')) throw new Error('Auth integration must not clear Guest workspace data.');
if (!config.includes('VITE_CLOUDBASE_PUBLISHABLE_KEY')) throw new Error('CloudBase publishable key config missing.');
console.log('auth foundation static checks passed; real CloudBase integration requires a configured Publishable Key');
