export interface SMLTreeNode {
  label: string
  indexPath: string
  type: string
  key: string
  children?: SMLTreeNode[]
}

interface BuildNode {
  label: string
  type: string
  index: number
  children?: BuildNode[]
}

export function parseSMLToTree(input: string): SMLTreeNode[] {
  const lines = input.split('\n').map(l => l.trimEnd())
  const root: BuildNode = { label: 'Message', type: 'ROOT', index: 0, children: [] }
  const stack: BuildNode[] = [root]
  let currentIndex = 0

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^S\d+F\d+/.test(line)) continue // Skip header like S6F11

    if (line === '>') {
      if (stack.length > 1) {
        stack.pop()
        currentIndex = stack[stack.length - 1].children!.length
      }
      continue
    }

    const parent = stack[stack.length - 1]
    const idx = currentIndex

    // Leaf node closed on same line: <TYPE value>
    const leafMatch = line.match(/^<([A-Za-z][A-Za-z0-9]*)\s+(.+?)>$/)
    if (leafMatch) {
      const type = leafMatch[1]
      const value = leafMatch[2]
      parent.children!.push({ label: `${type} ${value}`, type, index: idx })
      currentIndex++
      continue
    }

    // List start: <L [n]  or  <L>
    const listMatch = line.match(/^<([A-Za-z][A-Za-z0-9]*)\s*(?:\[(\d+)\])?$/)
    if (listMatch) {
      const type = listMatch[1]
      const count = listMatch[2]
      const label = count !== undefined ? `${type} [${count}]` : type
      const node: BuildNode = { label, type, index: idx, children: [] }
      parent.children!.push(node)
      stack.push(node)
      currentIndex = 0
      continue
    }

    // Fallback: type with value but no closing > (rare multi-line)
    const openMatch = line.match(/^<([A-Za-z][A-Za-z0-9]*)\s+(.+)$/)
    if (openMatch) {
      const type = openMatch[1]
      const value = openMatch[2]
      parent.children!.push({ label: `${type} ${value}`, type, index: idx })
      currentIndex++
      continue
    }
  }

  let keyCounter = 0

  function toTree(node: BuildNode, prefix: number[]): SMLTreeNode {
    const path = [...prefix, node.index]
    const result: SMLTreeNode = {
      label: node.label,
      type: node.type,
      indexPath: path.join(','),
      key: `node-${keyCounter++}`,
    }
    if (node.children) {
      result.children = node.children.map(c => toTree(c, path))
    }
    return result
  }

  // If there is a single top-level <L>, skip it in the path so that
  // the first element inside that list gets path "0" instead of "0,0".
  if (root.children?.length === 1 && root.children[0].type === 'L') {
    const outerL = root.children[0]
    const result: SMLTreeNode = {
      label: outerL.label,
      type: outerL.type,
      indexPath: '',
      key: `node-${keyCounter++}`,
    }
    if (outerL.children) {
      result.children = outerL.children.map(c => toTree(c, []))
    }
    return [result]
  }

  return root.children!.map(c => toTree(c, []))
}
