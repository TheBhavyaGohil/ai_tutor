import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the body and log it for debugging
    const body = await req.json();
    console.log("PDF Generation Request - Title:", body.title);
    console.log("PDF Generation Request - HTML Length:", body.html?.length);

    const { html, title } = body;

    // 2. Validate HTML (Check if it exists)
    if (!html || html.trim() === '' || html === '<p></p>') {
      console.error("PDF Error: HTML content matches 'false' (undefined or empty)");
      return NextResponse.json({ 
        error: 'Note is empty. Please add content before exporting.' 
      }, { status: 400 });
    }

    // 3. Launch Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    // 4. INJECT STYLES
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            
            body {
              font-family: 'Inter', sans-serif;
              padding: 40px;
              color: #334155; /* slate-700 */
              line-height: 1.6;
              max-width: 800px;
              margin: 0 auto;
            }
            
            /* --- HEADINGS --- */
            h1 { 
              font-size: 28px; 
              color: #0f172a; /* slate-900 */
              font-weight: 800; 
              margin-bottom: 16px; 
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 10px;
            }
            h2 { 
              font-size: 24px; 
              color: #1e293b; 
              font-weight: 700; 
              margin-top: 24px; 
              margin-bottom: 12px; 
            }
            h3 { 
              font-size: 20px; 
              color: #334155; 
              font-weight: 600; 
              margin-top: 20px; 
              margin-bottom: 10px; 
            }
            
            /* --- TEXT --- */
            p { margin-bottom: 12px; }
            strong { font-weight: 700; color: #0f172a; }
            em { font-style: italic; }
            
            /* --- LISTS --- */
            ul { list-style-type: disc; padding-left: 20px; margin-bottom: 12px; }
            ol { list-style-type: decimal; padding-left: 20px; margin-bottom: 12px; }
            li { margin-bottom: 4px; }
            
            /* --- EXTRAS --- */
            blockquote {
              border-left: 4px solid #cbd5e1;
              padding-left: 16px;
              color: #475569;
              font-style: italic;
              margin: 16px 0;
            }
            code {
              background-color: #f1f5f9;
              padding: 2px 4px;
              border-radius: 4px;
              font-family: monospace;
              font-size: 0.9em;
            }
          </style>
        </head>
        <body>
          <h1 style="text-align: center; margin-bottom: 40px; border: none;">${title || 'Document'}</h1>
          
          ${html}
        </body>
      </html>
    `;

    // 5. Render
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    await browser.close();

    // 6. Return PDF Blob
    // FIX: Use Buffer.from() to resolve the Uint8Array vs BlobPart type conflict
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title || 'note'}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}