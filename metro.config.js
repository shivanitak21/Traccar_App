const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit parallel workers to reduce memory pressure during bundling
config.maxWorkers = 2;

module.exports = config;
