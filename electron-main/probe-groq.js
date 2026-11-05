const fs = require('fs');
const path = require('path');

async function main() {
  const envPath = path.resolve(__dirname, '../website/.env.local');
  const envText = fs.readFileSync(envPath, 'utf8');
  const apiKey = envText.match(/^GROQ_API_KEY=(.+)$/m)?.[1]?.trim() || '';
  if (!apiKey) throw new Error('GROQ_API_KEY is missing.');

  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `Groq returned ${response.status}`);
  const models = Array.isArray(body?.data)
    ? body.data.map((model) => model?.id).filter(Boolean).sort()
    : [];
  const model = 'openai/gpt-oss-20b';
  const chatResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 32,
      stream: false,
      messages: [{ role: 'user', content: 'Reply with exactly: JARVIS_OK' }],
    }),
  });
  const chatBody = await chatResponse.json();
  if (!chatResponse.ok) throw new Error(chatBody?.error?.message || `Groq chat returned ${chatResponse.status}`);
  const reply = chatBody?.choices?.[0]?.message?.content?.trim() || '';
  process.stdout.write(JSON.stringify({ success: true, model, reply, models }));
}

main().catch((error) => {
  process.stdout.write(JSON.stringify({ success: false, error: error instanceof Error ? error.message : String(error) }));
  process.exitCode = 1;
});
