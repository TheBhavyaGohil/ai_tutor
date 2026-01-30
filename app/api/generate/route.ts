import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, language } = await req.json();
    const apiKey = "AIzaSyAeN5Nji44Ekxi0DTKxVWxpkizBSy5c0g4";
    if (!apiKey) {
      return new NextResponse('Missing GOOGLE_API_KEY in environment', { status: 500 });
    }

    // prompt: tutor behavior, language, and explicit formatting instruction
    const prompt = `You are an expert AI tutor for engineering students. Answer concisely and clearly in ${language}. 
Use examples, step-by-step explanations, and check for understanding. If the user asks for code, provide runnable snippets.
IMPORTANT: Return plain text only — do NOT include Markdown styling characters or site-specific styling characters. 
Specifically remove or avoid using "**", "&", and "#" characters in your response. User: ${message}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body = {
      contents: [
        {
          parts: [
            { text: prompt }
          ]
        }
      ],
      // safety or other params can be added here if required by API
    };

    const apiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const data = await apiRes.json();

    // attempt to extract text from common response shape used in examples
    const aiText = data?.candidates?.[0]?.content?.[0]?.parts?.[0]?.text
      || data?.candidates?.[0]?.content?.parts?.[0]?.text
      || data?.output?.[0]?.content?.[0]?.text
      || data?.text
      || JSON.stringify(data);

    // sanitize server-side: remove '*' '&' '#' characters (and collapse extra spaces)
    const sanitized = String(aiText).replace(/[*&#]+/g, '').replace(/\s{2,}/g, ' ').trim();

    return NextResponse.json({ text: sanitized });
  } catch (err) {
    return new NextResponse(String(err), { status: 500 });
  }
}