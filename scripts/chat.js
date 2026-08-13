const readline = require('readline');

// Using fetch (available natively in Node 18+)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const DEFAULT_AGENT_ID = '5549808b-82b6-47bc-ac6d-c0f3210f887d';
const DEFAULT_USER_ID = '148d2021-cd42-4ff5-8eaf-c5cdb9af8aa9';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const colors = {
  reset: "\x1b[0m",
  agent: "\x1b[35m", // Magenta
  user: "\x1b[36m",  // Cyan
  system: "\x1b[33m", // Yellow
  error: "\x1b[31m", // Red
  dim: "\x1b[2m"     // Dim
};

async function chat() {
  console.clear();
  console.log(`${colors.system}==========================================`);
  console.log(`🤖 ALICE - AI Agent Terminal Interface`);
  console.log(`==========================================${colors.reset}`);
  console.log(`${colors.dim}Type '/help' for commands, or just chat!${colors.reset}\n`);

  promptUser();
}

function promptUser() {
  rl.question(`${colors.user}You:${colors.reset} `, async (input) => {
    const text = input.trim();
    if (!text) return promptUser();

    if (text.startsWith('/')) {
      await handleCommand(text);
      return promptUser();
    }

    try {
      process.stdout.write(`${colors.dim}Alice is typing...${colors.reset}\r`);
      
      const response = await fetch(`${API_URL}/api/agent/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: DEFAULT_AGENT_ID,
          user_id: DEFAULT_USER_ID,
          message: text,
          source: 'cli',
          request_id: `cli-${Date.now()}`
        })
      });

      // Clear the "typing..." line
      process.stdout.write('\x1b[2K\r');

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`${colors.error}Error: ${errorText}${colors.reset}\n`);
      } else {
        const data = await response.json();
        console.log(`${colors.agent}Alice:${colors.reset} ${data.reply}`);
        
        if (data.actions && data.actions.length > 0) {
          console.log(`${colors.dim}  [Actions: ${data.actions.map(a => a.type || 'tool').join(', ')}]${colors.reset}`);
        }
        console.log(''); // blank line
      }
    } catch (err) {
      process.stdout.write('\x1b[2K\r');
      console.log(`${colors.error}Connection Error: Is the Next.js server running? (${err.message})${colors.reset}\n`);
    }

    promptUser();
  });
}

async function handleCommand(cmd) {
  try {
    if (cmd === '/exit' || cmd === '/quit') {
      console.log(`${colors.system}Goodbye!${colors.reset}`);
      process.exit(0);
    } else if (cmd === '/memories') {
      const res = await fetch(`${API_URL}/api/memories?agent_id=${DEFAULT_AGENT_ID}&user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      console.log(`${colors.system}--- Your Memories ---${colors.reset}`);
      data.memories.forEach(m => console.log(`- ${m.content} [${m.category}]`));
      console.log('');
    } else if (cmd === '/tasks') {
      const res = await fetch(`${API_URL}/api/tasks?agent_id=${DEFAULT_AGENT_ID}&user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      console.log(`${colors.system}--- Your Tasks ---${colors.reset}`);
      data.tasks.forEach(t => console.log(`[${t.status}] ${t.title}`));
      console.log('');
    } else if (cmd === '/automations') {
      const res = await fetch(`${API_URL}/api/automations?agent_id=${DEFAULT_AGENT_ID}&user_id=${DEFAULT_USER_ID}`);
      const data = await res.json();
      console.log(`${colors.system}--- Your Automations ---${colors.reset}`);
      data.automations.forEach(a => console.log(`[${a.status}] ${a.name} (${a.cron_schedule}) -> Next: ${new Date(a.next_run_at).toLocaleString()}`));
      console.log('');
    } else if (cmd === '/help') {
      console.log(`${colors.system}Commands:${colors.reset}`);
      console.log(`  /memories    - List all saved memories`);
      console.log(`  /tasks       - List all tasks`);
      console.log(`  /automations - List all background automations`);
      console.log(`  /exit        - Quit chat`);
      console.log('');
    } else {
      console.log(`${colors.error}Unknown command: ${cmd}${colors.reset}\n`);
    }
  } catch (err) {
    console.log(`${colors.error}Command Error: ${err.message}${colors.reset}\n`);
  }
}

chat();
