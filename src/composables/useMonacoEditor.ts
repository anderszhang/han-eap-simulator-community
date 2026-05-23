import { ref, onUnmounted, type Ref } from 'vue'
import * as monaco from 'monaco-editor'
import loader from '@monaco-editor/loader'

export interface LogEditorOptions {
  container: Ref<HTMLElement | undefined>
}

export interface SmlEditorOptions {
  container: Ref<HTMLElement | undefined>
  initialContent?: string
}

export function useMonacoEditor() {
  const logEditor = ref<monaco.editor.IStandaloneCodeEditor | null>(null)
  const smlEditor = ref<monaco.editor.IStandaloneCodeEditor | null>(null)
  const maxLogLines = 2000
  
  // 消息队列和批量更新控制
  let messageQueue: string[] = []
  let updateScheduled = false
  let lineCount = 0

  const initLogEditor = async (options: LogEditorOptions) => {
    if (!options.container.value) return

    const monacoInstance = await loader.init()
    logEditor.value = monacoInstance.editor.create(options.container.value, {
      value: '',
      theme: 'vs-dark',
      language: 'plaintext',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      readOnly: true
    })
    lineCount = 1
  }

  const initSmlEditor = async (options: SmlEditorOptions) => {
    if (!options.container.value) return

    const monacoInstance = await loader.init()
    smlEditor.value = monacoInstance.editor.create(options.container.value, {
      value: options.initialContent || '',
      theme: 'vs-dark',
      language: 'plaintext',
      automaticLayout: true,
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on'
    })
  }

  // 批量更新日志
  const flushMessages = () => {
    if (!logEditor.value || messageQueue.length === 0) {
      updateScheduled = false
      return
    }

    const model = logEditor.value.getModel()
    if (!model) {
      updateScheduled = false
      return
    }

    // 合并所有消息
    const allMessages = messageQueue.join('')
    messageQueue = []

    // 追加内容
    const lastLineLength = model.getLineMaxColumn(lineCount)
    logEditor.value.executeEdits('', [
      {
        range: new monaco.Range(lineCount, lastLineLength, lineCount, lastLineLength),
        text: allMessages,
        forceMoveMarkers: true
      }
    ])

    // 更新行数
    lineCount = model.getLineCount()

    // 限制日志行数（定期清理，不是每次都清理）
    if (lineCount > maxLogLines * 1.5) {
      const content = model.getValue()
      const lines = content.split('\n')
      const linesToKeep = maxLogLines
      const newContent = lines.slice(-linesToKeep).join('\n')
      logEditor.value.setValue(newContent)
      lineCount = model.getLineCount()
    }

    // 滚动到最后一行
    logEditor.value.revealLine(lineCount)
    
    updateScheduled = false
  }

  const addLogMessage = (message: string) => {
    if (!logEditor.value) return

    // 消息已经包含时间戳，直接添加换行符
    const formattedMessage = message + '\n'
    
    // 添加到队列
    messageQueue.push(formattedMessage)

    // 使用 requestAnimationFrame 批量更新
    if (!updateScheduled) {
      updateScheduled = true
      requestAnimationFrame(flushMessages)
    }
  }

  const loadSmlContent = (content: string) => {
    if (smlEditor.value) {
      smlEditor.value.setValue(content)
    }
  }

  const getSmlContent = (): string | null => {
    return smlEditor.value?.getValue() || null
  }

  const clearLogs = () => {
    if (logEditor.value) {
      logEditor.value.setValue('')
      lineCount = 1
      messageQueue = []
    }
  }

  const disposeAll = () => {
    if (logEditor.value) {
      logEditor.value.dispose()
      logEditor.value = null
    }
    if (smlEditor.value) {
      smlEditor.value.dispose()
      smlEditor.value = null
    }
    messageQueue = []
  }

  onUnmounted(() => {
    disposeAll()
  })

  return {
    logEditor,
    smlEditor,
    initLogEditor,
    initSmlEditor,
    addLogMessage,
    loadSmlContent,
    getSmlContent,
    clearLogs,
    disposeAll
  }
}
