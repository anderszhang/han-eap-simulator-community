import * as monaco from 'monaco-editor'

const SML_LANGUAGE_ID = 'sml'

let registered = false

export function registerSMLLanguage() {
  if (registered) return
  registered = true

  monaco.languages.register({ id: SML_LANGUAGE_ID })

  monaco.languages.setMonarchTokensProvider(SML_LANGUAGE_ID, {
    ignoreCase: false,
    tokenizer: {
      root: [
        // Line comments: // text
        [/\/\/.*$/, 'comment'],

        // Block comments: /* text */
        [/\/\*/, 'comment', '@blockComment'],

        // SxFx header: S1F1 W, S16F11 W
        [/S\d+F\d+(\s+W)?/, 'keyword'],

        // Control message types: LINKTEST.REQ, LINKTEST.RSP, SELECT.REQ, SELECT.RSP, DESELECT.REQ, DESELECT.RSP
        [/\b(LINKTEST|SELECT|DESELECT)\.(REQ|RSP|IND|RSP)\b/, 'keyword'],

        // Data type tags with optional [N] size: <L, <L [5], <U4, <U4 [1], <A, <A [2], etc.
        [/<[A-Z]\d*(\s+\[\d+(\.\.\d+)?\])?\s*/, 'type'],
        [/<\/?>/, 'type'],
        [/>/, 'type'],

        // Raw bytes: [00 0A FF ...] (hex bytes with spaces)
        [/\[[0-9A-Fa-f ]+\]/, 'number'],

        // Quoted strings: "value" or 'value'
        [/"[^"]*"/, 'string'],
        [/'[^']*'/, 'string'],

        // Numbers (integer, float, hex)
        [/\b\d+\.\d+\b/, 'number'],
        [/\b0x[0-9A-Fa-f]+\b/, 'number'],
        [/\b\d+\b/, 'number'],

        // Log direction keywords
        [/\b(Send|Receive|STATUS)\b/, 'tag'],

        // Timestamp: 2026-04-12 14:58:34.123
        [/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d+/, 'comment'],
      ],

      blockComment: [
        [/\*\//, 'comment', '@pop'],
        [/[^/*]+/, 'comment'],
        [/./, 'comment'],
      ],
    },
  })

  monaco.editor.defineTheme('sml-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0066CC', fontStyle: 'bold' },
      { token: 'type', foreground: '7A3E9D' },
      { token: 'string', foreground: '2E7D32' },
      { token: 'number', foreground: 'C62828' },
      { token: 'comment', foreground: '9E9E9E' },
      { token: 'tag', foreground: 'FF6F00', fontStyle: 'bold' },
    ],
    colors: {},
  })

  monaco.languages.registerFoldingRangeProvider(SML_LANGUAGE_ID, {
    provideFoldingRanges(model: monaco.editor.ITextModel): monaco.languages.FoldingRange[] {
      const ranges: monaco.languages.FoldingRange[] = []
      const lineCount = model.getLineCount()

      // Message blocks in log view: fold from [hex...] line to end of message
      let msgStart = 0
      for (let i = 1; i <= lineCount; i++) {
        if (model.getLineContent(i).startsWith('[')) {
          if (msgStart > 0 && msgStart < i - 1) {
            ranges.push({ start: msgStart, end: i - 1, kind: monaco.languages.FoldingRangeKind.Region })
          }
          msgStart = i
        }
      }
      if (msgStart > 0 && msgStart < lineCount) {
        ranges.push({ start: msgStart, end: lineCount, kind: monaco.languages.FoldingRangeKind.Region })
      }

      // SML lists: <L[N] opens, > closes
      const stack: number[] = []
      for (let i = 1; i <= lineCount; i++) {
        const trimmed = model.getLineContent(i).trim()
        if (trimmed.match(/^<L(\s+\[\d+\])?\s*$/) && !trimmed.endsWith('>')) {
          stack.push(i)
        } else if (trimmed === '>' && stack.length > 0) {
          const start = stack.pop()!
          if (start < i) {
            ranges.push({ start, end: i })
          }
        }
      }

      return ranges
    }
  })
}
