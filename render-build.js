const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting build process for Render...');

// Set environment variables for production
process.env.NODE_ENV = 'production';
process.env.BABEL_ENV = 'production';

// Ensure the dist directory exists
const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(distPath)) {
  console.log('📁 Creating dist directory...');
  fs.mkdirSync(distPath, { recursive: true });
}

// Run the build process
try {
  console.log('🔧 Installing dependencies...');
  execSync('npm install --production=false', { stdio: 'inherit' });

  console.log('🛠️  Building the application...');
  execSync('npm run build', { stdio: 'inherit' });

  console.log('✅ Build completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}
