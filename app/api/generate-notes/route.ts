import { NextRequest, NextResponse } from 'next/server';
import { Groq } from 'groq-sdk';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, context } = body;

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ 
        error: 'Prompt is required' 
      }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API KEY' }, { status: 500 });
    }

    const groq = new Groq({ apiKey });

    // --- UPDATED SYSTEM PROMPT: NOTION / NOTEBOOKLLM STYLE ---
    const systemPrompt = `
    You are an advanced AI assistant modeled after Notion AI, designed to create structured, formatted editor content.
    
    **CORE INSTRUCTION:**
    Analyze the user's request to determine the INTENT:
    1. **Study Notes / Summaries / Explanations:** If the user asks for "notes", "definitions", "summary", or provides a syllabus, generate **informative content** with definitions and explanations. Use standard bullet points (<ul>).
    2. **Task Lists / Plans / To-Do:** If (and ONLY if) the user explicitly asks for a "checklist", "todo list", "action plan", or "tasks", use the interactive **Task List** format.

    **HTML OUTPUT RULES:**
    - Output **RAW HTML** only.
    - **No Markdown.** No \`\`\` blocks.
    - **NO EMPTY LINES. NO EXTRA NEWLINES. NO WHITESPACE-ONLY CONTENT.**
    - **NO empty <li> tags, NO empty <p> tags, NO empty paragraphs.**
    - Each <li> must contain actual text content.
    - Use <h2> for main section headers (only when needed).
    - Use <strong> for key terms.
    - Compact output: write continuously, omit unnecessary spacing.

    **FORMATTING SCHEMAS:**

    **TYPE A: For STUDY NOTES (Default)**
    Use standard unordered lists. Expand on the topics briefly.
    Example:
    <ul>
      <li><strong>LAN (Local Area Network):</strong> A network that connects devices within a limited area.</li>
      <li><strong>Router:</strong> A device that forwards data packets between computer networks.</li>
    </ul>

    **TYPE B: For TASK LISTS (Specific Request Only)**
    Use the specific Tiptap task syntax.
    Example:
    <ul data-type="taskList">
       <li data-type="taskItem" data-checked="false">Install Node.js</li>
       <li data-type="taskItem" data-checked="true">Setup Database</li>
    </ul>

    **STRICT RULES:**
    - NEVER output empty <li></li> tags
    - NEVER output standalone newlines or </li><li> without text
    - NEVER use <br> or empty paragraphs
    - Each item must have meaningful content before closing tag
    - No bullet points for section breaks or spacing

    Context provided: ${context || 'None'}
`;
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5, // Lower temperature for more structured output
      max_tokens: 2000,
      stream: true, 
    });

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) controller.enqueue(encoder.encode(content));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    });

  } catch (error) {
    console.error('Error in generate-notes:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}