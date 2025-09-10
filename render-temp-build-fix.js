// This is a temporary build script to fix fibers issue
const fs = require('fs');
const path = require('path');

// Fix webpack.config.js
const webpackConfigPath = path.join(__dirname, 'webpack.config.js');
let webpackConfig = fs.readFileSync(webpackConfigPath, 'utf8');

// Remove any fibers reference
webpackConfig = webpackConfig.replace(/fiber:\s*require\('fibers'\),?/g, '');
fs.writeFileSync(webpackConfigPath, webpackConfig);

console.log('✅ Fixed webpack.config.js');
