// Debug utility for development-only logging
export const debug = __DEV__ ? console.log : () => {};
export const mark = (label: string) => __DEV__ && console.time(label);
export const stop = (label: string) => __DEV__ && console.timeEnd(label);

// Keep error logs in all environments for crash reporting
export const logError = console.error;
export const logWarn = console.warn;