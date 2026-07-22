const fs = require('fs');

const filePath = 'src/components/admin/ManageIssues.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Split by lines and fix the corrupted separator lines
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('Volume CRUD')) {
    lines[i - 1] = '  // ================================================================================';
    lines[i + 1] = '  // ================================================================================';
  }
  if (lines[i].includes('Issue CRUD')) {
    lines[i - 1] = '  // ================================================================================';
    lines[i + 1] = '  // ================================================================================';
  }
  if (lines[i].includes('Paper CRUD')) {
    lines[i - 1] = '  // ================================================================================';
    lines[i + 1] = '  // ================================================================================';
  }
}

const fixed = lines.join('\n');
fs.writeFileSync(filePath, fixed, 'utf8');
console.log('File fixed successfully!');
