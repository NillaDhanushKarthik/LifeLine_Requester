const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Limit worker concurrency to prevent V8 Zone/heap allocation crashes on multi-core Windows machines
config.maxWorkers = 2;

module.exports = config;
