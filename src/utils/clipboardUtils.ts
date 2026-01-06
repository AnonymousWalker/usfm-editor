import { Editor, Range } from "slate"

/**
 * Copies the selected text from the Slate editor to the clipboard
 * @param editor - The Slate editor instance
 * @returns Promise<boolean> - Returns true if copy was successful, false otherwise
 */
export async function copySelectedText(editor: Editor): Promise<boolean> {
    if (!editor.selection || Range.isCollapsed(editor.selection)) {
        // No selection, nothing to copy
        return false
    }

    try {
        // Get the selected text from Slate editor
        const selectedText = Editor.string(editor, editor.selection)
        // Copy to clipboard using the Clipboard API
        if (selectedText) {
            await navigator.clipboard.writeText(selectedText)
            return true
        }
    } catch (error) {
        console.error("Failed to copy text:", error)
        // Fallback: try using the DOM selection
        try {
            const domSelection = window.getSelection()
            if (domSelection && domSelection.rangeCount > 0) {
                const text = domSelection.toString()
                await navigator.clipboard.writeText(text)
                return true
            }
        } catch (fallbackError) {
            console.error("Fallback copy also failed:", fallbackError)
        }
    }

    return false
}

