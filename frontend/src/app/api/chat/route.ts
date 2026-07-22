import { NextRequest } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { messages, modelSettings } = await req.json();
    
    const systemPrompt = modelSettings?.systemPrompt || 
      "You are JARVIS, an advanced AI Operating System. You are polite, extremely smart, efficient, and loyal. Address the user as 'Sir' or 'Ma'am' when appropriate. Provide concise, system-oriented answers.";

    const rawModel = (modelSettings?.model || 'llama-3.3-70b-versatile').toLowerCase();
    const temperature = modelSettings?.temperature ?? 0.7;
    const topP = modelSettings?.topP ?? 0.9;
    const maxTokens = modelSettings?.maxTokens ?? 2048;

    // Detect Provider
    const isGemini = rawModel.includes('gemini');
    const isOpenAI = rawModel.includes('gpt-') || rawModel.includes('openai');
    const isOllama = rawModel.includes('ollama') || rawModel.includes('qwen') || rawModel.includes('deepseek-r1');

    // 1. Google Gemini Handler
    if (isGemini) {
      const geminiApiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!geminiApiKey) {
        // Fallback warning if key missing
        return new Response('Error: GEMINI_API_KEY is not configured on server.', { status: 400 });
      }

      // Map model name to valid Gemini model identifier
      let targetGeminiModel = 'gemini-1.5-flash';
      if (rawModel.includes('pro')) targetGeminiModel = 'gemini-1.5-pro';
      if (rawModel.includes('2.0')) targetGeminiModel = 'gemini-2.0-flash';
      if (rawModel.includes('3.6') || rawModel.includes('flash-high')) targetGeminiModel = 'gemini-1.5-flash'; // stable alias

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetGeminiModel}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...messages.map((m: any) => ({
          role: m.role === 'jarvis' || m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || '' }]
        }))
      ];

      const geminiRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature,
            topP,
            maxOutputTokens: maxTokens,
          }
        })
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        return new Response(`Gemini API error: ${errText}`, { status: geminiRes.status });
      }

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = geminiRes.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }
          let buffer = '';
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed.startsWith('data: ')) {
                  try {
                    const json = JSON.parse(trimmed.slice(6));
                    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) controller.enqueue(encoder.encode(text));
                  } catch {}
                }
              }
            }
          } catch (e) {
            console.error('Gemini stream error:', e);
          } finally {
            controller.close();
          }
        }
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }

    // 2. OpenAI / Custom OpenAI compatible Handler
    let apiEndpoint = 'https://api.groq.com/openai/v1/chat/completions';
    let apiKey = process.env.GROQ_API_KEY;

    if (isOpenAI) {
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
    } else if (isOllama) {
      apiEndpoint = modelSettings?.backendUrl ? `${modelSettings.backendUrl}/v1/chat/completions` : 'http://localhost:11434/v1/chat/completions';
      apiKey = 'ollama';
    }

    const apiRes = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelSettings?.model || 'llama-3.3-70b-versatile',
        temperature,
        top_p: topP,
        max_tokens: maxTokens,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map((msg: any) => ({
            role: msg.role === 'jarvis' ? 'assistant' : msg.role,
            content: msg.content,
          })),
        ],
      }),
    });

    if (!apiRes.ok) {
      const err = await apiRes.text();
      console.error('API error:', err);
      return new Response(JSON.stringify({ error: 'AI Provider Error', details: err }), {
        status: apiRes.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = apiRes.body?.getReader();
        if (!reader) {
          controller.close();
          return;
        }

        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {}
            }
          }
        } catch (err) {
          console.error('Stream read error:', err);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}