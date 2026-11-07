/**
 * Public CloudBase client configuration.
 * The production SDK adapter should read these values at runtime from Vite env.
 * No admin/service key is permitted in browser code.
 */
export const cloudbaseConfig = Object.freeze({
  envId: import.meta.env.VITE_CLOUDBASE_ENV_ID || 'focus-space-d5gmg1bimc422765f',
  region: import.meta.env.VITE_CLOUDBASE_REGION || 'ap-shanghai',
  publishableKey: import.meta.env.VITE_CLOUDBASE_PUBLISHABLE_KEY || ''
});

export function assertCloudBaseConfig() {
  if (cloudbaseConfig.envId !== 'focus-space-d5gmg1bimc422765f') {
    throw new Error('Focus Space must use its independent CloudBase environment.');
  }
  if (cloudbaseConfig.region !== 'ap-shanghai') {
    throw new Error('Focus Space CloudBase region must be ap-shanghai.');
  }
  return cloudbaseConfig;
}
