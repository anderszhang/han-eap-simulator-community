import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const readmePath = path.join(root, 'README.md')
const docsImageDir = path.join(root, 'docs', 'images')
const outDir = path.join(root, 'public', 'help')
const outImageDir = path.join(outDir, 'images')
const outPath = path.join(outDir, 'index.html')
const developerPath = path.join(root, 'DEVELOPER.md')

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineMarkdown(value) {
  let result = escapeHtml(value)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const safeSrc = String(src).replace(/^docs\/images\//, 'images/')
    return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}">`
  })
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
  result = result.replace(/`([^`]+)`/g, '<code>$1</code>')
  result = result.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  return result
}

function renderTable(rows) {
  const htmlRows = rows.map((row, index) => {
    const cells = row.trim().replace(/^\||\|$/g, '').split('|').map(cell => inlineMarkdown(cell.trim()))
    const tag = index === 0 ? 'th' : 'td'
    return `<tr>${cells.map(cell => `<${tag}>${cell}</${tag}>`).join('')}</tr>`
  })
  return `<table>${htmlRows.join('\n')}</table>`
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/)
  const html = []
  let i = 0
  let inList = false
  let inCode = false
  let codeInfo = ''
  const codeLines = []

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (!inCode) {
        closeList()
        inCode = true
        codeInfo = line.slice(3).trim()
        codeLines.length = 0
      } else {
        html.push(`<pre><code class="language-${escapeHtml(codeInfo)}">${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        inCode = false
        codeInfo = ''
      }
      i += 1
      continue
    }

    if (inCode) {
      codeLines.push(line)
      i += 1
      continue
    }

    if (/^\|.+\|$/.test(line) && i + 1 < lines.length && /^\|\s*-+/.test(lines[i + 1])) {
      closeList()
      const tableRows = [line]
      i += 2
      while (i < lines.length && /^\|.+\|$/.test(lines[i])) {
        tableRows.push(lines[i])
        i += 1
      }
      html.push(renderTable(tableRows))
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      i += 1
      continue
    }

    const listItem = line.match(/^- (.+)$/)
    if (listItem) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${inlineMarkdown(listItem[1])}</li>`)
      i += 1
      continue
    }

    const orderedItem = line.match(/^\d+\. (.+)$/)
    if (orderedItem) {
      closeList()
      const orderedRows = []
      while (i < lines.length) {
        const match = lines[i].match(/^\d+\. (.+)$/)
        if (!match) break
        orderedRows.push(`<li>${inlineMarkdown(match[1])}</li>`)
        i += 1
      }
      html.push(`<ol>${orderedRows.join('\n')}</ol>`)
      continue
    }

    if (!line.trim()) {
      closeList()
      i += 1
      continue
    }

    closeList()
    html.push(`<p>${inlineMarkdown(line)}</p>`)
    i += 1
  }

  closeList()
  return html.join('\n')
}

function copyImages() {
  fs.mkdirSync(outImageDir, { recursive: true })
  if (!fs.existsSync(docsImageDir)) return
  for (const file of fs.readdirSync(docsImageDir)) {
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file)) continue
    fs.copyFileSync(path.join(docsImageDir, file), path.join(outImageDir, file))
  }
}

const markdown = fs.readFileSync(readmePath, 'utf8')
const body = markdownToHtml(markdown)

fs.mkdirSync(outDir, { recursive: true })
copyImages()
if (fs.existsSync(developerPath)) {
  fs.copyFileSync(developerPath, path.join(outDir, 'DEVELOPER.md'))
}

fs.writeFileSync(outPath, `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HH EAP Simulator Help</title>
  <style>
    :root {
      color: #1f2937;
      background: #f3f4f6;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    body { margin: 0; }
    main {
      max-width: 1080px;
      margin: 0 auto;
      padding: 32px 24px 56px;
      background: #fff;
      min-height: 100vh;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
    }
    h1 { margin-top: 0; font-size: 32px; }
    h2 { margin-top: 38px; padding-bottom: 8px; border-bottom: 1px solid #e5e7eb; }
    h3 { margin-top: 28px; }
    p, li { line-height: 1.75; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
    img {
      display: block;
      max-width: 100%;
      margin: 16px 0 28px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
    }
    code {
      padding: 2px 6px;
      border-radius: 4px;
      background: #f3f4f6;
      color: #b45309;
    }
    pre {
      overflow: auto;
      padding: 16px;
      border-radius: 8px;
      background: #0f172a;
      color: #e5e7eb;
    }
    pre code { background: transparent; color: inherit; padding: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
    }
    th, td {
      border: 1px solid #e5e7eb;
      padding: 10px 12px;
      text-align: left;
    }
    th { background: #f9fafb; }
  </style>
</head>
<body>
  <main>
${body}
  </main>
</body>
</html>
`, 'utf8')

console.log(`Help generated: ${path.relative(root, outPath)}`)
