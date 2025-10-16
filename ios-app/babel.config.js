module.exports = function (api) {
  api.cache(true);

  // Check if we're in production mode
  // This works with both NODE_ENV=production and --no-dev flag
  const isProd = process.env.NODE_ENV === 'production' || process.env.BABEL_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Strip ALL console.* statements in production builds
      // This provides belt-and-suspenders protection against iOS crashes
      // Our if (__DEV__) guards are the primary defense, this is backup
      isProd && [
        'transform-remove-console',
        {
          exclude: [] // Remove ALL console methods (log, warn, error, etc.)
        }
      ],
    ].filter(Boolean),
  };
};