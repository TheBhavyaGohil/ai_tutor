import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { message, files, conversationHistory, continue: continueRequest } = await request.json();

    const approxCharsPerToken = 4;
    const maxOutputTokens = 2000;
    const maxInputTokens = 7000;
    const maxInputChars = maxInputTokens * approxCharsPerToken;
    const maxChunks = 2;
    const continueMarker = '[[CONTINUE]]';
    let needsMore = false;

    const trimText = (text: string, maxChars: number) =>
      text.length > maxChars ? text.slice(0, Math.max(0, maxChars - 3)) + '...' : text;
    const stripContinue = (text: string) =>
      text.replace(new RegExp(`${continueMarker}\\s*$`, 'i'), '').trimEnd();

    // Handle multiple files
    const fileNames = files.map((f: any) => f.name).join(', ');
    const perFileBudget = Math.floor((maxInputChars * 0.55) / Math.max(1, files.length));
    const combinedContent = files
      .map((f: any, idx: number) => {
        const content = typeof f.content === 'string' ? f.content : '';
        return `\n\n=== DOCUMENT ${idx + 1}: ${f.name} ===\n${trimText(content, perFileBudget)}`;
      })
      .join('\n');

    // Build context with file content and conversation history
    const systemPrompt = `You are a helpful AI assistant specialized in explaining and answering questions about documents. 
You are currently helping the user understand ${files.length === 1 ? 'a PDF document' : `${files.length} PDF documents`} named: ${fileNames}.

Here is the content of the ${files.length === 1 ? 'document' : 'documents'}:
${combinedContent}

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
- When answering from multiple documents, mention which document you're referencing
- If the user asks about something not in the ${files.length === 1 ? 'document' : 'documents'}, let them know politely
- Keep your responses well-structured and easy to read`;

    // Build messages array
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add conversation history (limit to reduce input tokens)
    const recentHistory = Array.isArray(conversationHistory) ? conversationHistory.slice(-6) : [];
    messages.push(...recentHistory);

    // Add current message
    const safeMessage = typeof message === 'string' ? trimText(message, Math.floor(maxInputChars * 0.1)) : '';
    if (continueRequest) {
      messages.push({
        role: 'user',
        content: 'Continue from your last response without repeating. Finish any incomplete code or lists.'
      });
    } else {
      messages.push({ role: 'user', content: safeMessage });
    }

    const callGroq = async (activeMessages: any[]) => {
      const chatCompletion = await groq.chat.completions.create({
        messages: activeMessages,
        model: 'llama-3.3-70b-versatile', // Fast and capable model
        temperature: 0.7,
        max_tokens: maxOutputTokens,
        top_p: 1,
        stream: false
      });
      return {
        text: chatCompletion.choices[0]?.message?.content || '',
        finishReason: chatCompletion.choices[0]?.finish_reason || ''
      };
    };

    let combinedText = '';
    let result = await callGroq(messages);
    let rawText = result.text;

    if (!rawText) {
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 500 }
      );
    }

    let chunkCount = 1;
    needsMore = rawText.trimEnd().endsWith(continueMarker) || result.finishReason === 'length';
    while (needsMore && chunkCount < maxChunks) {
      combinedText += stripContinue(rawText) + '\n\n';
      messages.push({ role: 'assistant', content: stripContinue(rawText) });
      messages.push({ role: 'user', content: 'continue' });
      result = await callGroq(messages);
      rawText = result.text;
      chunkCount += 1;
      if (!rawText) {
        break;
      }
      needsMore = rawText.trimEnd().endsWith(continueMarker) || result.finishReason === 'length';
    }

    combinedText += stripContinue(rawText);

    // Return the response with markdown formatting intact
      const hasMore = needsMore && chunkCount >= maxChunks;
      return NextResponse.json({ response: combinedText.trim(), hasMore });
  } catch (error: any) {
    console.error('Error in chat-pdf API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
