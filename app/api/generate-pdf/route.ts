import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

// Force dynamic to prevent caching issues
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Parse the body
    const body = await req.json();
    const { html, title } = body;

    console.log("PDF Generation Request for:", title);

    // 2. Validate HTML
    if (!html || html.trim() === '' || html === '<p></p>') {
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

    // 4. Construct HTML with Checkbox Fixes
    const fullHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
            body { font-family: 'Inter', sans-serif; padding: 25px; color: #334155; line-height: 1.4; max-width: 800px; margin: 0 auto; }
            h1 { font-size: 24px; font-weight: 800; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px; }
            
            /* TASK LIST STYLING FOR PDF */
            ul[data-type="taskList"] { 
              list-style: none; 
              padding: 0; 
              margin: 0 0 12px 0;
            }
            
            li[data-type="taskItem"] { 
              display: flex; 
              align-items: flex-start; 
              gap: 10px;
              margin-bottom: 8px;
            }
            
            li[data-type="taskItem"] label { 
              display: flex; 
              align-items: center;
              flex-shrink: 0;
              cursor: pointer;
              margin: 0;
              padding: 0;
            }
            
            /* Checkbox styling - simple and PDF-friendly */
            li[data-type="taskItem"] input[type="checkbox"] {
              width: 16px;
              height: 16px;
              margin: 0;
              padding: 0;
              cursor: pointer;
              accent-color: #4f46e5;
              flex-shrink: 0;
            }
            
            li[data-type="taskItem"] > div {
              flex: 1;
              padding: 0;
              margin: 0;
            }
            
            li[data-type="taskItem"] > div > p {
              margin: 0;
              padding: 0;
              line-height: 1.4;
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          ${html}
        </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true, 
      margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${title || 'note'}.pdf"`,
      },
    });

  } catch (error: any) {
    console.error('PDF Server Error:', error);
    // Return JSON so the client doesn't crash with "Unexpected end of JSON"
    return NextResponse.json({ error: 'Failed to generate PDF. Check server logs.' }, { status: 500 });
  }
}