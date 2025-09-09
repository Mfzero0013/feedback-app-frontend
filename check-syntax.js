const fs = require('fs');
const { spawnSync } = require('child_process');

// Read the file content
const filePath = './main/main.js';
const content = fs.readFileSync(filePath, 'utf8');

// Check for syntax errors
const result = spawnSync('node', ['--check'], {
  input: content,
  encoding: 'utf8'
});

if (result.status === 0) {
  console.log('No syntax errors found in the file.');
} else {
  console.error('Syntax errors found:');
  console.error(result.stderr);
}
