import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

export async function POST(request: NextRequest) {
  try {
    const { message, files, conversationHistory } = await request.json();

    // Handle multiple files
    const fileNames = files.map((f: any) => f.name).join(', ');
    const combinedContent = files
      .map((f: any, idx: number) => {
        return `\n\n=== DOCUMENT ${idx + 1}: ${f.name} ===\n${f.content.substring(0, 15000 / files.length)}`;
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

    // Add conversation history (last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10);
    messages.push(...recentHistory);

    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Groq API
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile', // Fast and capable model
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false
    });

    // 1. Extract the actual text string from the Groq response structure
    const rawText = chatCompletion.choices[0]?.message?.content;

    if (!rawText) {
      return NextResponse.json(
        { error: 'AI returned an empty response' },
        { status: 500 }
      );
    }

    // Return the response with markdown formatting intact
    return NextResponse.json({ response: rawText });
  } catch (error: any) {
    console.error('Error in chat-pdf API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
