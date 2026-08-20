import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const docsImageDir = path.join(root, 'docs', 'images')
const outDir = path.join(root, 'public', 'help')
const outImageDir = path.join(outDir, 'images')
const developerPath = path.join(root, 'DEVELOPER.md')

const languages = [
  { code: 'zh-CN', file: 'README.zh-CN.md', label: '中文' },
  { code: 'en', file: 'README.en.md', label: 'English' },
]

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function rewriteLink(href) {
  if (href === 'README.zh-CN.md') return 'zh-CN.html'
  if (href === 'README.en.md') return 'en.html'
  return href
}

function inlineMarkdown(value) {
  let result = escapeHtml(value)
  result = result.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_m, alt, src) => {
    const safeSrc = String(src).replace(/^docs\/images\//, 'images/')
    return `<img src="${escapeHtml(safeSrc)}" alt="${escapeHtml(alt)}">`
  })
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, href) => {
    return `<a href="${escapeHtml(rewriteLink(href))}">${inlineMarkdown(text)}</a>`
  })
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

function buildPage({ title, body, lang, showLanguageSwitch, isLanding }) {
  const languageSwitch = showLanguageSwitch
    ? `<nav class="language-switch">
        ${languages.map(l =>
          `<a class="language-link${l.code === lang ? ' active' : ''}" href="${l.code === 'zh-CN' ? 'zh-CN.html' : 'en.html'}">${l.label}</a>`
        ).join(' <span class="language-separator">|</span> ')}
       </nav>`
    : ''

  const autoRedirect = isLanding
    ? `<script>
        (function () {
          const nav = navigator.language || navigator.userLanguage || ''
          if (nav.toLowerCase().startsWith('zh')) {
            location.replace('zh-CN.html')
          } else {
            location.replace('en.html')
          }
        })()
      </script>`
    : ''

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  ${autoRedirect}
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
    .language-switch {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 16px;
      font-size: 14px;
    }
    .language-link {
      color: #2563eb;
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
    }
    .language-link:hover {
      text-decoration: underline;
      background: #eff6ff;
    }
    .language-link.active {
      color: #1f2937;
      font-weight: 600;
      background: #e5e7eb;
      pointer-events: none;
    }
    .language-separator { color: #d1d5db; }
    .landing-links {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }
    .landing-card {
      display: block;
      padding: 24px;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      text-align: center;
      font-size: 18px;
      font-weight: 500;
      background: #f9fafb;
      transition: background 0.2s, box-shadow 0.2s;
    }
    .landing-card:hover {
      background: #fff;
      box-shadow: 0 10px 24px rgba(15, 23, 42, 0.1);
      text-decoration: none;
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
${languageSwitch}
${body}
  </main>
</body>
</html>
`
}

fs.mkdirSync(outDir, { recursive: true })
copyImages()

if (fs.existsSync(developerPath)) {
  fs.copyFileSync(developerPath, path.join(outDir, 'DEVELOPER.md'))
}

// Generate per-language help pages from the split README files.
for (const { code, file, label } of languages) {
  const filePath = path.join(root, file)
  if (!fs.existsSync(filePath)) {
    console.warn(`Skipping missing help source: ${file}`)
    continue
  }
  const markdown = fs.readFileSync(filePath, 'utf8')
  const body = markdownToHtml(markdown)
  const html = buildPage({
    title: 'Han Eap Simulator Help',
    body,
    lang: code,
    showLanguageSwitch: true,
    isLanding: false,
  })
  const outPath = path.join(outDir, `${code}.html`)
  fs.writeFileSync(outPath, html, 'utf8')
  console.log(`Help generated: ${path.relative(root, outPath)} (${label})`)
}

// Generate the landing page from README.md, which is now a short language selector.
const readmePath = path.join(root, 'README.md')
if (fs.existsSync(readmePath)) {
  const landingMarkdown = fs.readFileSync(readmePath, 'utf8')
  let landingBody = markdownToHtml(landingMarkdown)

  // If README.md is only a stub, append prominent cards to each language version.
  const hasLanguageCards = languages.some(l => landingBody.includes(`href="${l.code}.html"`))
  if (!hasLanguageCards) {
    const cards = languages
      .filter(l => fs.existsSync(path.join(root, l.file)))
      .map(l => `<a class="landing-card" href="${l.code}.html">${l.label}</a>`)
      .join('\n')
    landingBody += `\n<div class="landing-links">\n${cards}\n</div>`
  }

  const landingHtml = buildPage({
    title: 'Han Eap Simulator Help',
    body: landingBody,
    lang: 'zh-CN',
    showLanguageSwitch: true,
    isLanding: true,
  })
  const landingOutPath = path.join(outDir, 'index.html')
  fs.writeFileSync(landingOutPath, landingHtml, 'utf8')
  console.log(`Help landing generated: ${path.relative(root, landingOutPath)}`)
}
