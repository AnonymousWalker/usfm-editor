import { Range, Editor, Text, NodeEntry } from "slate"


const PATTERN = /\d[a-zA-Z]/g

/**
 * Decorate function to highlight text matching the pattern \d+\w+
 * This finds all matches in text nodes and returns ranges for highlighting
 */
export function decorateWithPatternHighlight(
    editor: Editor,
    entry: NodeEntry
): Range[] {
    const [node, path] = entry
    const ranges: Range[] = []

    if (!Text.isText(node)) {
        return ranges
    }

    const text = node.text
    if (!text) {
        return ranges
    }

    // Find all matches of the pattern in the text
    let match: RegExpExecArray | null
    // Reset regex lastIndex to ensure we start from the beginning
    PATTERN.lastIndex = 0

    while ((match = PATTERN.exec(text)) !== null) {
        const startOffset = match.index
        const endOffset = startOffset + match[0].length

        ranges.push({
            anchor: { path, offset: startOffset },
            focus: { path, offset: endOffset },
            isPatternMatch: true,
        } as Range & { isPatternMatch: boolean })
    }

    return ranges
}
