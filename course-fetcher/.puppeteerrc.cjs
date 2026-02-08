const { join } = require('path');

/**
 * Puppeteer configuration for Railway deployment
 * This ensures Chrome is cached properly during the build process
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Store Chrome in a persistent location
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
