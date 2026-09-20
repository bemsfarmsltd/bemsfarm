const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const mdPath = path.join(__dirname, '..', 'DRIVER_MOBILE_APP_API_SPECIFICATION.md');
const htmlPath = path.join(__dirname, '..', 'scratch_driver_api_doc.html');
const pdfPath = path.join(__dirname, '..', 'BEMS_FARMS_DRIVER_APP_API_SPECIFICATION.pdf');

const mdContent = fs.readFileSync(mdPath, 'utf8');

function convertMarkdownToHtml(md) {
  let html = md;

  // Escape HTML entities inside code blocks first
  const codeBlocks = [];
  html = html.replace(/```([a-z]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `___CODE_BLOCK_${codeBlocks.length}___`;
    const escapedCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(`<div class="code-container"><div class="code-header">${lang ? lang.toUpperCase() : 'PAYLOAD'}</div><pre><code>${escapedCode}</code></pre></div>`);
    return placeholder;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Tables
  html = html.replace(/\|(.+)\|/g, (match) => {
    return match; // Keep raw for table block parser
  });

  // Headings
  html = html.replace(/^# (.*$)/gim, '<h1 class="doc-h1">$1</h1>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="doc-h2">$1</h2>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="doc-h3">$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4 class="doc-h4">$1</h4>');

  // Bold & Italic
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Lists
  html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
  html = html.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul class="doc-list">$1</ul>');

  // Dividers
  html = html.replace(/^---$/gim, '<hr class="doc-divider" />');

  // Table parser
  html = html.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
    const lines = match.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return match;
    const headerCols = lines[0].split('|').map(c => c.trim()).filter(Boolean);
    const isSeparator = lines[1].includes('---');
    const startIdx = isSeparator ? 2 : 1;

    let tableHtml = '<table class="doc-table"><thead><tr>';
    headerCols.forEach(col => {
      tableHtml += `<th>${col}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    for (let i = startIdx; i < lines.length; i++) {
      const rowCols = lines[i].split('|').map(c => c.trim()).filter(Boolean);
      tableHtml += '<tr>';
      rowCols.forEach(col => {
        tableHtml += `<td>${col}</td>`;
      });
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';
    return tableHtml;
  });

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`___CODE_BLOCK_${i}___`, block);
  });

  return html;
}

const parsedBody = convertMarkdownToHtml(mdContent);

const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Bems Farms - Driver Mobile App API Specification</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1E293B;
      background: #FFFFFF;
      font-size: 13px;
      line-height: 1.6;
    }

    .header-banner {
      background: linear-gradient(135deg, #0F5132 0%, #198754 100%);
      color: #FFFFFF;
      padding: 24px 28px;
      border-radius: 12px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .header-subtitle {
      font-size: 13px;
      color: #D1E7DD;
      font-weight: 500;
    }

    .header-meta {
      text-align: right;
      font-size: 11px;
      color: #A3CFBB;
    }

    .doc-h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0F172A;
      margin-top: 24px;
      margin-bottom: 12px;
      border-bottom: 2px solid #E2E8F0;
      padding-bottom: 6px;
    }

    .doc-h2 {
      font-size: 16px;
      font-weight: 700;
      color: #0F5132;
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }

    .doc-h3 {
      font-size: 14px;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    .doc-h4 {
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      margin-top: 10px;
      margin-bottom: 4px;
      page-break-after: avoid;
    }

    p {
      margin-bottom: 10px;
    }

    .doc-list {
      margin-left: 20px;
      margin-bottom: 12px;
    }

    .doc-list li {
      margin-bottom: 4px;
    }

    .inline-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11.5px;
      background: #F1F5F9;
      color: #0F5132;
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: 600;
      border: 1px solid #E2E8F0;
    }

    .code-container {
      background: #0F172A;
      border-radius: 8px;
      margin: 10px 0 16px 0;
      overflow: hidden;
      border: 1px solid #1E293B;
      page-break-inside: avoid;
    }

    .code-header {
      background: #1E293B;
      color: #94A3B8;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
      padding: 6px 12px;
      border-bottom: 1px solid #334155;
    }

    pre {
      padding: 12px 14px;
      overflow-x: auto;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #F8FAFC;
      line-height: 1.5;
    }

    .doc-table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 18px 0;
      font-size: 12px;
      page-break-inside: avoid;
    }

    .doc-table th {
      background: #F8FAFC;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #E2E8F0;
    }

    .doc-table td {
      padding: 7px 10px;
      border: 1px solid #E2E8F0;
      color: #475569;
    }

    .doc-table tr:nth-child(even) td {
      background: #FAFAFA;
    }

    .doc-divider {
      border: none;
      border-top: 1px solid #E2E8F0;
      margin: 20px 0;
    }

    .footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #E2E8F0;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #94A3B8;
    }
  </style>
</head>
<body>

  <div class="header-banner">
    <div>
      <div class="header-title">Bems Farms — Driver App API Reference</div>
      <div class="header-subtitle">Mobile Application Endpoints, Payloads & Flow Specification</div>
    </div>
    <div class="header-meta">
      <div>Version 1.0.0</div>
      <div>Confidential · 2026</div>
    </div>
  </div>

  ${parsedBody}

  <div class="footer">
    <div>Bems Farms Limited · Driver App & Logistics Integration</div>
    <div>Generated for Mobile Engineering Team</div>
  </div>

</body>
</html>
`;

fs.writeFileSync(htmlPath, fullHtml, 'utf8');

try {
  const chromePath = '/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome';
  execSync(`${chromePath} --headless --disable-gpu --print-to-pdf="${pdfPath}" --no-pdf-header-footer "${htmlPath}"`);
  console.log(`✅ Driver API PDF successfully generated at: ${pdfPath}`);
} catch (err) {
  console.error('Error generating Driver API PDF with Chrome:', err.message);
} finally {
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }
}
