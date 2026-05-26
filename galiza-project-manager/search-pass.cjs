const fs = require('fs');
const path = require('path');

const rootDir = 'c:\\Users\\TESTE\\OneDrive\\Desktop\\ESTAGIO\\s\\denv do app\\app dev\\projeto-galiza-mensuravel-\\galiza-project-manager';

function searchFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('postgres') || content.includes('password') || content.includes('postgresql://') || content.includes(':5432')) {
      console.log(`Found match in: ${filePath}`);
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('postgres') || line.includes('password') || line.includes('postgresql://') || line.includes(':5432')) {
          console.log(`  Line ${idx + 1}: ${line.substring(0, 100).trim()}`);
        }
      });
    }
  } catch (err) {}
}

function traverse(dir) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        traverse(fullPath);
      } else {
        searchFile(fullPath);
      }
    }
  } catch (err) {}
}

traverse(rootDir);
