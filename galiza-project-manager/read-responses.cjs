const fs = require('fs');

const logPath = 'C:\\Users\\TESTE\\.gemini\\antigravity\\brain\\eb8f5f59-b3c8-4162-9073-ea58ad3b4c13\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.trim().split('\n');
  
  console.log('--- RESPONSES BETWEEN 154 AND 206 ---');
  for (let i = 154; i <= 206; i++) {
    if (i >= lines.length) break;
    const obj = JSON.parse(lines[i]);
    if (obj.source === 'MODEL' && obj.type === 'PLANNER_RESPONSE') {
      console.log(`Step ${i}:`);
      console.log(`  Content: ${obj.content}`);
      console.log('--------------------------------------');
    }
  }
} catch (err) {
  console.error('Error reading logs:', err);
}
