const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Esta es la línea mágica para Windows
config.resolver.unstable_conditionNames = ['browser', 'require', 'import'];

module.exports = config;