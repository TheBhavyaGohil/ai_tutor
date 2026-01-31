import { NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      return new NextResponse('Missing GROQ_API_KEY in environment', { status: 500 });
    }

    const groq = new Groq({ apiKey });

    // prompt: tutor behavior, language, and explicit formatting instruction
    const prompt = `You are an expert AI tutor for engineering students. Answer concisely and clearly in ${language}. 
Use examples, step-by-step explanations, and check for understanding.

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

User question: ${message}`;

    const completion = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const aiText = completion.choices[0]?.message?.content || '';

    return NextResponse.json({ text: aiText });
  } catch (err) {
    console.error('API Error:', err);
    return new NextResponse(String(err), { status: 500 });
  }
}