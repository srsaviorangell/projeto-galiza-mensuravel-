const fs = require('fs');

const logPath = 'C:\\Users\\TESTE\\.gemini\\antigravity\\brain\\eb8f5f59-b3c8-4162-9073-ea58ad3b4c13\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.trim().split('\n');
  
  console.log('--- USER INPUTS IN THIS CONVERSATION ---');
  for (let i = 0; i < lines.length; i++) {
    const obj = JSON.parse(lines[i]);
    if (obj.source === 'USER_EXPLICIT' || obj.type === 'USER_INPUT') {
      console.log(`Step ${i} (${obj.source || 'USER'}):`);
      console.log(`  Content: ${obj.content}`);
      console.log('--------------------------------------');
    }
  }
} catch (err) {
  console.error('Error reading logs:', err);
}
