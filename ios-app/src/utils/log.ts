// Development-only logging utility
// All console statements are guarded behind __DEV__ to prevent iOS production crashes

export const log = (...args: unknown[]) => {
  if (__DEV__) console.log(...args);
};

export const warn = (...args: unknown[]) => {
  if (__DEV__) console.warn(...args);
};

export const error = (...args: unknown[]) => {
  if (__DEV__) console.error(...args);
};

export const debug = (...args: unknown[]) => {
  if (__DEV__) console.debug(...args);
};

// Re-export for backwards compatibility with existing if (__DEV__) blocks
export const devLog = log;
export const devWarn = warn;
export const devError = error;
