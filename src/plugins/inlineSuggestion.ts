import { Range, Editor, Transforms, Text, Node as SlateNode, NodeEntry, Element, Path } from "slate"
import { ReactEditor } from "slate-react"
import { MyEditor } from "./helpers/MyEditor"
import { VerseTransforms } from "./helpers/VerseTransforms"

// Type for suggestion state
export interface SuggestionState {
    suggestion: string
    range: Range | null
}

// Store suggestion state in a WeakMap to avoid polluting the editor object
const suggestionStateMap = new WeakMap<Editor, SuggestionState>()

export function getSuggestionState(editor: Editor): SuggestionState {
    let state = suggestionStateMap.get(editor)
    if (!state) {
        state = { suggestion: "", range: null }
        suggestionStateMap.set(editor, state)
    }
    return state
}

export function setSuggestionState(
    editor: Editor,
    suggestion: string,
    range: Range | null
): void {
    suggestionStateMap.set(editor, { suggestion, range })
}

export function clearSuggestion(editor: Editor): void {
    suggestionStateMap.set(editor, { suggestion: "", range: null })
}

/**
 * Plugin that provides inline suggestions for USFM markers
 */
export const withInlineSuggestion = (editor: ReactEditor): ReactEditor => {
    const { insertText, deleteBackward } = editor

    // Override insertText to detect when to show suggestions
    editor.insertText = (text: string) => {
        const { selection } = editor

        if (selection && Range.isCollapsed(selection)) {
            const currentNode = Editor.node(editor, selection.anchor.path)

            if (currentNode && Text.isText(currentNode[0])) {
                const textContent = currentNode[0].text
                const offset = selection.anchor.offset
                const textBeforeCursor = textContent.substring(0, offset)

                // Check if user just typed a backslash or is continuing after a backslash
                const afterInsert = textBeforeCursor + text
                
                // Pattern: detect \v pattern (backslash followed by optional letters)
                const backslashPattern = /\\([a-z]*)$/i
                const match = afterInsert.match(backslashPattern)

                if (match) {
                    const typedMarker = match[1]
                    
                    // Suggest based on what's typed so far
                    let suggestion = ""
                    
                    // Get the next verse number to suggest
                    const nextVerseNumber = getNextVerseNumber(editor)
                    
                    // If nothing after \, suggest "v {number} " (verse with number)
                    if (typedMarker === "") {
                        suggestion = nextVerseNumber ? `v ${nextVerseNumber} ` : "v "
                    } else if (typedMarker === "v") {
                        // Already typed \v, suggest space, number and space
                        suggestion = nextVerseNumber ? ` ${nextVerseNumber} ` : " "
                    } else if ("v".startsWith(typedMarker.toLowerCase())) {
                        // Partially typed \v
                        const remaining = "v".substring(typedMarker.length)
                        suggestion = nextVerseNumber 
                            ? `${remaining} ${nextVerseNumber} `
                            : `${remaining} `
                    }

                    if (suggestion) {
                        // Calculate the range where the suggestion should appear
                        const suggestionRange: Range = {
                            anchor: { 
                                path: selection.anchor.path, 
                                offset: offset + text.length 
                            },
                            focus: { 
                                path: selection.anchor.path, 
                                offset: offset + text.length 
                            },
                        }
                        setSuggestionState(editor, suggestion, suggestionRange)
                    } else {
                        clearSuggestion(editor)
                    }
                } else {
                    clearSuggestion(editor)
                }
            }
        }

        insertText(text)
    }

    // Clear suggestion when deleting
    editor.deleteBackward = (...args) => {
        clearSuggestion(editor)
        deleteBackward(...args)
    }

    return editor
}

/**
 * Handle Tab key to accept the suggestion
 */
export function handleTabKeyForSuggestion(
    event: React.KeyboardEvent,
    editor: Editor
): boolean {
    if (event.key !== "Tab") return false

    const state = getSuggestionState(editor)
    if (!state.suggestion || !state.range) return false

    // Prevent default tab behavior
    event.preventDefault()

    const { selection } = editor
    if (selection && Range.isCollapsed(selection)) {
        // Extract verse number from suggestion
        // Suggestion formats: "v 6 ", "6 ", "v ", " "
        const verseNumberMatch = state.suggestion.match(/\d+/)
        
        if (verseNumberMatch) {
            const verseNumber = verseNumberMatch[0]
            
            // Use the refactored function to create the verse and get the new verse path
            if (editor.selection) {
                const newVersePath = VerseTransforms.addVerseAtPoint(editor, editor.selection.anchor, verseNumber)
                
                // Move cursor to the new verse's inline container if the verse was created successfully
                if (newVersePath) {
                    const newInlineContainerPath = newVersePath.concat(1, 0)
                    Transforms.select(editor, Editor.start(editor, newInlineContainerPath))
                }
            }
            
            // Delete the backslash (and any partial text like "\v")
            const currentNode = Editor.node(editor, selection.anchor.path)
            if (currentNode && Text.isText(currentNode[0])) {
                const textContent = currentNode[0].text
                const offset = selection.anchor.offset
                const textBeforeCursor = textContent.substring(0, offset)
                
                // Find and delete the backslash pattern
                const backslashMatch = textBeforeCursor.match(/\\[a-z]*$/i)
                if (backslashMatch) {
                    const deleteStart = offset - backslashMatch[0].length
                    Transforms.delete(editor, {
                        at: {
                            anchor: { path: selection.anchor.path, offset: deleteStart },
                            focus: { path: selection.anchor.path, offset: offset }
                        }
                    })
                }
            }
            
            clearSuggestion(editor)
            return true
        } else {
            // No verse number in suggestion, just insert the text
            Transforms.insertText(editor, state.suggestion)
            clearSuggestion(editor)
            return true
        }
    }

    return false
}

/**
 * Decorate function to show suggestions as grayed-out text
 */
export function decorateWithSuggestion(
    editor: Editor,
    entry: NodeEntry
): Range[] {
    const [node, path] = entry
    const ranges: Range[] = []

    if (!Text.isText(node)) {
        return ranges
    }

    const state = getSuggestionState(editor)
    const { selection } = editor

    // Only show suggestion if:
    // 1. There is a suggestion
    // 2. The cursor is at the position where the suggestion should appear
    // 3. The current node matches the suggestion's node
    if (
        state.suggestion &&
        state.range &&
        selection &&
        Range.isCollapsed(selection) &&
        state.range.anchor.path.toString() === path.toString()
    ) {
        const offset = state.range.anchor.offset

        // Check if cursor is at the right position
        if (
            selection.anchor.path.toString() === path.toString() &&
            selection.anchor.offset === offset
        ) {
            ranges.push({
                anchor: { path, offset },
                focus: { path, offset },
                suggestion: state.suggestion,
                isSuggestion: true,
            } as Range & { suggestion: string; isSuggestion: boolean })
        }
    }

    return ranges
}

/**
 * Get the next verse number to suggest based on the current verse
 */
function getNextVerseNumber(editor: Editor): number | null {
    try {
        const verseNodeEntry = MyEditor.getVerseNode(editor)
        if (!verseNodeEntry) return null
        
        const [verseNode] = verseNodeEntry
        if (!Element.isElement(verseNode) || !verseNode.children[0]) return null
        
        // Get the current verse number/range as a string
        const verseNumberStr = SlateNode.string(verseNode.children[0])
        
        // Handle "front" verse
        if (verseNumberStr === "front") return 1
        
        // Parse the verse number (handle ranges like "5-6" by taking the last number)
        const match = verseNumberStr.match(/(\d+)(?:-(\d+))?/)
        if (!match) return null
        
        // If it's a range (e.g., "5-6"), use the last number, otherwise use the single number
        const currentVerseNumber = match[2] ? parseInt(match[2]) : parseInt(match[1])
        
        // Return the next verse number
        return currentVerseNumber + 1
    } catch (error) {
        console.error("Error getting next verse number:", error)
        return null
    }
}

