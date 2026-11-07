import cloudbase from '@cloudbase/js-sdk';
import { assertCloudBaseConfig, cloudbaseConfig } from './config.js';

let app = null;
let auth = null;
let initError = null;
let pendingVerification = null;

function messageFrom(error, fallback = 'CloudBase authentication failed. Please try again.') {
  if (!error) return fallback;
  return error.message || error.error_description || error.code || fallback;
}

function requireAuth() {
  if (!auth) {
    throw new Error(cloudbaseConfig.publishableKey
      ? 'CloudBase authentication is not initialized. Please try again.'
      : 'CloudBase Publishable Key is not configured. Guest workspace remains available.');
  }
  return auth;
}

function unwrap(result, fallback) {
  if (result?.error) throw new Error(messageFrom(result.error, fallback));
  return result?.data ?? result;
}

export function initializeAuth() {
  if (auth || initError) return { configured: Boolean(auth), error: initError };
  try {
    assertCloudBaseConfig();
    if (!cloudbaseConfig.publishableKey) return { configured: false, error: null };
    app = cloudbase.init({
      env: cloudbaseConfig.envId,
      region: cloudbaseConfig.region,
      ...(cloudbaseConfig.publishableKey ? { accessKey: cloudbaseConfig.publishableKey } : {})
    });
    // SDK v3 exposes the auth service as an app.auth property.
    auth = app.auth;
    if (!auth || typeof auth.getSession !== 'function') throw new Error('CloudBase Auth SDK is unavailable.');
    return { configured: true, error: null };
  } catch (error) {
    initError = new Error(messageFrom(error, 'CloudBase initialization failed.'));
    return { configured: false, error: initError };
  }
}

export function getAuthStatus() {
  return { configured: Boolean(auth), error: initError, envId: cloudbaseConfig.envId, region: cloudbaseConfig.region };
}

export async function getCurrentSession() {
  return unwrap(await requireAuth().getSession(), 'Unable to restore the CloudBase session.');
}

export async function getCurrentUser() {
  const result = unwrap(await requireAuth().getUser(), 'Unable to load the CloudBase user.');
  return result?.user ?? result ?? null;
}

export function onAuthStateChange(callback) {
  const service = requireAuth();
  const subscription = service.onAuthStateChange((event, session, info) => callback({ event, session, info }));
  return subscription?.data?.subscription || subscription?.subscription || subscription;
}

export async function signUpWithEmail(email, password) {
  const result = unwrap(await requireAuth().signUp({ email, password }), 'Unable to start registration.');
  pendingVerification = result?.verifyOtp || null;
  return { ...result, requiresVerification: Boolean(pendingVerification) };
}

export async function verifyRegistrationCode(token) {
  if (!pendingVerification) throw new Error('Start registration before entering a verification code.');
  const result = unwrap(await pendingVerification({ token }), 'The registration code is invalid or expired.');
  pendingVerification = null;
  return result;
}

export async function signInWithEmail(email, password) {
  return unwrap(await requireAuth().signInWithPassword({ email, password }), 'Email or password is incorrect.');
}

export async function sendEmailOtp(email) {
  const result = unwrap(await requireAuth().signInWithOtp({ email, options: { shouldCreateUser: false } }), 'Unable to send the sign-in code.');
  pendingVerification = result?.verifyOtp || null;
  return result;
}

export async function verifyEmailOtp(token) {
  if (!pendingVerification) throw new Error('Send a sign-in code before entering it.');
  const result = unwrap(await pendingVerification({ token }), 'The sign-in code is invalid or expired.');
  pendingVerification = null;
  return result;
}

export async function signOut() {
  return unwrap(await requireAuth().signOut(), 'Unable to sign out.');
}
