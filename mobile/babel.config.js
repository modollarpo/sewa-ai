// SEWA XAI — mobile/babel.config.js
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@screens':   './src/screens',
        '@store':     './src/store',
        '@services':  './src/services',
        '@components':'./src/components',
        '@hooks':     './src/hooks',
      },
    }],
    'react-native-reanimated/plugin', // must be last
  ],
};
