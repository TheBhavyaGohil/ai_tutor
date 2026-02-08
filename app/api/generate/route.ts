import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { message, language, continue: continueRequest, conversationHistory } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;
    const maxOutputTokens = 1500;
    const maxChunks = 2;
    const continueMarker = '[[CONTINUE]]';
    
    if (!apiKey) {
      return new NextResponse('Missing GROQ_API_KEY in environment', { status: 500 });
    }

    const groq = new Groq({ apiKey });

    const userLine = continueRequest
      ? 'Continue the previous response without repeating. Finish any incomplete code or lists.'
      : `User question: ${message}`;

    // prompt: tutor behavior, language, and explicit formatting instruction
    const prompt = `You are an expert AI tutor for engineering students with integrated calendar reminder capabilities. Answer concisely and clearly in ${language}. 
Use examples, step-by-step explanations, and check for understanding.

REMINDER HANDLING:
- If user asks to set a reminder, alarm, or mentions a time with @ (e.g., "remind me @ 10:45 for X"), respond EXACTLY like this:
  "Sure, I'll add a reminder to your calendar for [what they want to remember]."
- DO NOT provide Python scripts, system commands, or any code for setting reminders
- DO NOT explain manual reminder methods
- Just naturally acknowledge and confirm - the system handles it automatically
- Be conversational and helpful

EVENT REMOVAL HANDLING:
- If user asks to remove/delete/clear events from calendar (e.g., "remove all events from today", "delete every event"), respond EXACTLY like this:
  "I'll remove all events from your calendar for [date]."
- NO long explanations, NO asking for confirmation, NO code snippets
- Keep it brief and let the system handle the deletion
- The system will remove events automatically

IMPORTANT FORMATTING INSTRUCTIONS:
- Use proper Markdown formatting for clear, structured responses
- Use **bold** for emphasis and important terms
- Use headings (## Heading) to organize your answers
- Use bullet points (- item) or numbered lists (1. item) when listing things
- When providing code, ALWAYS wrap it in code blocks with the language specified:
  \`\`\`python
  # your code here
  \`\`\`
- Use inline code (\`code\`) for short code snippets or technical terms
- Use > for important notes or quotes
- Provide runnable code examples when requested
- Keep your responses well-structured and easy to read

${userLine}`;

    const stripContinue = (text: string) =>
      text.replace(new RegExp(`${continueMarker}\\s*$`, 'i'), '').trimEnd();

    const callGroq = async (activeMessages: any[]) => {
      const completion = await groq.chat.completions.create({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: activeMessages,
        temperature: 0.7,
        max_tokens: maxOutputTokens,
      });
      return {
        text: completion.choices[0]?.message?.content || '',
        finishReason: completion.choices[0]?.finish_reason || ''
      };
    };

    const messages: any[] = [{ role: 'user', content: prompt }];
    if (continueRequest && Array.isArray(conversationHistory)) {
      const tail = conversationHistory.slice(-2);
      tail.forEach((item: any) => {
        if (item?.role && item?.text) {
          messages.push({ role: item.role, content: item.text });
        }
      });
    }

    if (continueRequest) {
      messages.push({
        role: 'user',
        content: 'Continue from your last response without repeating. Finish any incomplete code or lists.'
      });
    }

    let result = await callGroq(messages);
    let aiText = result.text;

    if (!aiText) {
      return NextResponse.json({ text: '' });
    }

    let combinedText = '';
    let chunkCount = 1;
    let needsMore = aiText.trimEnd().endsWith(continueMarker) || result.finishReason === 'length';
    while (needsMore && chunkCount < maxChunks) {
      combinedText += stripContinue(aiText) + '\n\n';
      messages.push({ role: 'assistant', content: stripContinue(aiText) });
      messages.push({ role: 'user', content: 'continue' });
      result = await callGroq(messages);
      aiText = result.text;
      chunkCount += 1;
      if (!aiText) {
        break;
      }
      needsMore = aiText.trimEnd().endsWith(continueMarker) || result.finishReason === 'length';
    }

    combinedText += stripContinue(aiText);

    const hasMore = needsMore && chunkCount >= maxChunks;
    return NextResponse.json({ text: combinedText.trim(), hasMore });
  } catch (err) {
    console.error('API Error:', err);
    return new NextResponse(String(err), { status: 500 });
  }
}