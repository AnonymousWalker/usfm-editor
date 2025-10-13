import { Range, Editor, Transforms, Path, Node, Text } from "slate"
import { MyEditor } from "./helpers/MyEditor"
import { MyTransforms } from "./helpers/MyTransforms"
import { UsfmMarkers } from "../utils/UsfmMarkers"
import { ReactEditor } from "slate-react"
import { SelectionTransforms } from "./helpers/SelectionTransforms"
import { emptyVerseWithVerseNumber } from "../transforms/basicSlateNodeFactory"
import { VerseTransforms } from "./helpers/VerseTransforms"

export function handleKeyPress(
    event: React.KeyboardEvent,
    editor: Editor
): void {
    if (event.key === "ArrowLeft") {
        onLeftArrowPress(event, editor)
    } else if (event.key === "ArrowRight") {
        onRightArrowPress(event, editor)
    }

    if (!isNavigationKey(event) && isVerseOrChapterNumSelected(editor)) {
        console.debug("Verse or chapter number selected, preventing action")
        event.preventDefault()
    }
}

export const withEnter = (editor: ReactEditor): ReactEditor => {
    editor.insertBreak = () => {
        splitToInsertParagraph(editor)
    }
    return editor
}

export const withBackspace = (editor: ReactEditor): ReactEditor => {
    const { deleteBackward } = editor

    editor.deleteBackward = (...args) => {
        const { selection } = editor

        if (
            selection?.anchor &&
            Range.isCollapsed(selection) &&
            Editor.isStart(
                editor,
                selection.anchor,
                Editor.parent(editor, selection?.anchor)?.[1]
            )
        ) {
            // Check if we're at the start of an inline container with a verse number before it
            if (MyEditor.isNearbyBlockAVerseNumber(editor, "previous")) {
                const prevBlock = MyEditor.getPreviousBlock(editor)?.[0]
                
                // Don't allow deleting the "front" verse marker
                if (prevBlock && Node.string(prevBlock) === "front") {
                    console.debug("Cannot delete 'front' verse, skipping backspace")
                    return
                }
                
                // Delete the verse number and merge with previous verse
                const verseNodeEntry = MyEditor.getVerseNode(editor)
                if (verseNodeEntry) {
                    const [_verse, versePath] = verseNodeEntry
                    const verseNumPath = versePath.concat(0)
                    
                    // Check if there's a previous verse to merge into
                    const prevVerse = MyEditor.getPreviousVerse(editor, versePath)
                    if (prevVerse) {
                        // Use the existing transform to remove verse and concatenate
                        VerseTransforms.removeVerseAndConcatenateContentsWithPrevious(
                            editor,
                            verseNumPath
                        )
                    } else {
                        // If no previous verse, just remove the verse number
                        Transforms.removeNodes(editor, { at: verseNumPath })
                    }
                }
                return
            } else if (
                MyEditor.isNearbyBlockAVerseOrChapterNumberOrNull(
                    editor,
                    "previous"
                )
            ) {
                console.debug("Invalid previous node, skipping backspace")
                return
            } else if (
                MyEditor.isNearbyBlockAnInlineContainer(editor, "previous")
            ) {
                MyTransforms.mergeSelectedBlockAndSetToInlineContainer(editor, {
                    mode: "previous",
                })
                return
            }
        }
        deleteBackward(...args)
    }
    return editor
}

export const withDelete = (editor: ReactEditor): ReactEditor => {
    const { deleteForward } = editor

    editor.deleteForward = (...args) => {
        const { selection } = editor

        if (
            selection?.focus &&
            Range.isCollapsed(selection) &&
            Editor.isEnd(
                editor,
                selection.focus,
                Editor.parent(editor, selection?.focus)?.[1]
            )
        ) {
            if (
                MyEditor.isNearbyBlockAVerseOrChapterNumberOrNull(
                    editor,
                    "next"
                )
            ) {
                console.debug("Invalid next node, skipping delete")
                return
            } else if (
                MyEditor.isNearbyBlockAnEmptyInlineContainer(editor, "current")
            ) {
                MyTransforms.mergeSelectedBlockAndSetToInlineContainer(editor, {
                    mode: "next",
                })
                return
            }
        }
        deleteForward(...args)
    }
    return editor
}

export const withVerseShortcut = (editor: ReactEditor): ReactEditor => {
    const { insertText } = editor

    editor.insertText = (text: string) => {
        const { selection } = editor

        if (selection && Range.isCollapsed(selection)) {
            const currentNode = Editor.node(editor, selection.anchor.path)
            
            if (currentNode && Text.isText(currentNode[0])) {
                const textContent = currentNode[0].text
                const offset = selection.anchor.offset
                const textBeforeCursor = textContent.substring(0, offset)
                
                // Both patterns trigger on space character
                if (text === " ") {
                    let verseNumber: string | null = null
                    let matchLength = 0
                    
                    // Pattern 1: \v {number} followed by space
                    const versePattern = /\\v\s+(\d+)$/
                    const verseMatch = textBeforeCursor.match(versePattern)
                    
                    if (verseMatch) {
                        verseNumber = verseMatch[1]
                        matchLength = verseMatch[0].length
                    } else {
                        // Pattern 2: {number}.  (number followed by period and double space)
                        const numberPattern = /(^|\s)(\d+)\.\s$/
                        const numberMatch = textBeforeCursor.match(numberPattern)
                        
                        if (numberMatch) {
                            verseNumber = numberMatch[2]
                            matchLength = numberMatch[0].length
                        }
                    }
                    
                    // If either pattern matched, create the verse
                    if (verseNumber) {
                        // Delete the matched text
                        const deleteStart = offset - matchLength
                        Transforms.delete(editor, {
                            at: {
                                anchor: { path: selection.anchor.path, offset: deleteStart },
                                focus: { path: selection.anchor.path, offset: offset }
                            }
                        })
                        
                        // Insert new verse
                        const verseNodeEntry = MyEditor.getVerseNode(editor)
                        if (verseNodeEntry) {
                            const [_verse, versePath] = verseNodeEntry
                            const newVerse = emptyVerseWithVerseNumber(verseNumber)
                            Transforms.insertNodes(editor, newVerse, { at: Path.next(versePath) })
                            MyTransforms.moveToEndOfLastLeaf(editor, Path.next(versePath))
                        }
                        
                        return
                    }
                }
            }
        }

        insertText(text)
    }

    return editor
}

function onLeftArrowPress(event: React.KeyboardEvent, editor: Editor) {
    const blockPath = MyEditor.getCurrentBlock(editor)?.[1]
    const prevBlock = MyEditor.getPreviousBlock(editor)?.[0]
    const selection = editor.selection
    // Move left through a verse number node to the end of the previous verse,
    // but do not attempt to move left through a "front" verse node.
    if (
        blockPath &&
        prevBlock &&
        selection &&
        MyEditor.isNearbyBlockAVerseNumber(editor, "previous") &&
        Range.isCollapsed(selection) &&
        Editor.isStart(editor, selection.anchor, blockPath)
    ) {
        event.preventDefault()

        if (Node.string(prevBlock) == "front") return

        const prevVerseEntry = MyEditor.getPreviousVerse(
            editor,
            selection.focus.path,
            true
        )
        if (prevVerseEntry) {
            SelectionTransforms.moveToEndOfLastLeaf(editor, prevVerseEntry[1])
        } else {
            console.debug(
                "Previous node is a non-front verse number, but no prior verse exists"
            )
        }
    }
}

function onRightArrowPress(event: React.KeyboardEvent, editor: Editor) {
    const chapterNodeEntry = MyEditor.getChapterNode(editor)
    if (
        chapterNodeEntry &&
        editor.selection &&
        Range.isCollapsed(editor.selection) &&
        Editor.isEnd(editor, editor.selection.anchor, chapterNodeEntry[1])
    ) {
        event.preventDefault()
    }
}

/**
 * Splits the block container and changes the resulting block to a paragraph type
 */
function splitToInsertParagraph(editor: Editor) {
    // If there is an empty text selected, we need to move the selecton forward,
    // or else the selection will stay on the previous line
    MyTransforms.selectNextSiblingNonEmptyText(editor)
    const point = editor.selection?.anchor
    if (!point) {
        console.error("Couldn't get splitToInsertParagraph point.")
        return
    }
    const [_, parentPath] = Editor.parent(editor, point)
    // After splitting a node, the resulting nodes may be combined via normalization,
    // so run these together without normalizing
    Editor.withoutNormalizing(editor, () => {
        Transforms.splitNodes(editor, { always: true })
        Transforms.setNodes(
            editor,
            { type: UsfmMarkers.PARAGRAPHS.p },
            { at: Path.next(parentPath) }
        )
    })
}

function isVerseOrChapterNumSelected(editor: Editor) {
    if (!editor.selection) return false
    for (const [node] of Editor.nodes(editor, { at: editor.selection })) {
        if (UsfmMarkers.isVerseOrChapterNumber(node)) {
            return true
        }
    }
    return false
}

const navigationKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]

function isNavigationKey(event: React.KeyboardEvent) {
    return navigationKeys.includes(event.key)
}
