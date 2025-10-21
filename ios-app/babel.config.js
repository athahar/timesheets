module.exports = function (api) {
  api.cache(true);

  // Only strip console in actual production builds (EAS build for iOS)
  // Allow console logs during local testing, even with NODE_ENV=production
  const isProductionBuild = process.env.EAS_BUILD === 'true' || process.env.BABEL_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip ALL console.* statements in production builds ONLY
      // This provides belt-and-suspenders protection against iOS crashes
      // Our if (__DEV__) guards are the primary defense, this is backup
      isProductionBuild && [
        'transform-remove-console',
        {
          exclude: [] // Remove ALL console methods (log, warn, error, etc.)
        }
      ],
    ].filter(Boolean),
  };
};