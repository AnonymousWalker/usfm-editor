import { Range, Editor, Transforms, Path, Node, Text, Point } from "slate"
import { MyEditor } from "./helpers/MyEditor"
import { MyTransforms } from "./helpers/MyTransforms"
import { UsfmMarkers } from "../utils/UsfmMarkers"
import { ReactEditor } from "slate-react"
import { SelectionTransforms } from "./helpers/SelectionTransforms"
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
                        // Capture the length of the previous verse's text before merging
                        const prevVersePath = prevVerse[1]
                        const prevInlineContainerPath = prevVersePath.concat(1)
                        let prevTextLength = 0
                        try {
                            const [prevInlineContainer] = Editor.node(
                                editor,
                                prevInlineContainerPath
                            )
                            prevTextLength = Node.string(prevInlineContainer).length
                        } catch (_) {
                            prevTextLength = 0
                        }

                        // Use the existing transform to remove verse and concatenate
                        VerseTransforms.removeVerseAndConcatenateContentsWithPrevious(
                            editor,
                            verseNumPath
                        )
                        // After merge, place cursor at the offset equal to the previous text length
                        try {
                            // Start at the beginning of the previous inline container
                            Transforms.select(
                                editor,
                                Editor.start(editor, prevInlineContainerPath)
                            )
                            if (prevTextLength > 0) {
                                Transforms.move(editor, {
                                    distance: prevTextLength,
                                    unit: "offset",
                                })
                            }
                        } catch (e) {
                            // Fallbacks if structure differs unexpectedly
                            try {
                                Transforms.select(
                                    editor,
                                    Editor.end(editor, prevInlineContainerPath)
                                )
                            } catch (_) {
                                Transforms.select(
                                    editor,
                                    Editor.end(editor, prevVersePath)
                                )
                            }
                        }
                    } else {
                        // If no previous verse, just remove the verse number
                        Transforms.removeNodes(editor, { at: verseNumPath })
                        // Keep cursor at the start of the verse contents (now at index 0)
                        const inlineContainerPath = versePath.concat(0)
                        try {
                            Transforms.select(
                                editor,
                                Editor.start(editor, inlineContainerPath)
                            )
                        } catch (e) {
                            // Fall back to start of the verse node
                            Transforms.select(editor, Editor.start(editor, versePath))
                        }
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
                        const numberPattern = /(^|\s)(\d+)\.$/
                        const numberMatch = textBeforeCursor.match(numberPattern)

                        // Do not trigger on numbers greater than 180
                        if (numberMatch && parseInt(numberMatch[2], 10) < 180) {
                            verseNumber = numberMatch[2]
                            matchLength = numberMatch[0].length - 1

                            const isCursorAtEndOfNode = offset >= currentNode[0].text.length
                            let extraSpaceLength = 0
                            if (isCursorAtEndOfNode) {
                                // workaround for inserting verse at the end of a paragraph, it should not wrap the next line into the same paragraph
                                const pointBeforeInsert = selection.anchor
                                Transforms.insertText(editor, " ")
                                Transforms.select(editor, pointBeforeInsert)
                            }

                            const isInsertingAtBeginningOfNode = offset === matchLength + 1
                            let originalSelectionAnchor = selection.anchor

                            if (isInsertingAtBeginningOfNode) {
                                console.log("adding verse at the beginning of the text")
                                // Insert space and move cursor forward, following pattern from VerseTransforms
                                Transforms.insertText(editor, " ", { at: { path: selection.anchor.path, offset: 0 } })
                                const pointAfterInsert: Point = { path: selection.anchor.path, offset: selection.anchor.offset + 1 }
                                Transforms.select(editor, pointAfterInsert)
                                originalSelectionAnchor = pointAfterInsert
                                extraSpaceLength++
                            }

                            // Use the refactored function to create the verse and get the new verse path
                            const newVersePath = VerseTransforms.addVerseAtPoint(editor, originalSelectionAnchor, verseNumber)

                            // Delete the matched text
                            const deleteStart = offset - matchLength
                            Transforms.delete(editor, {
                                at: {
                                    anchor: { path: selection.anchor.path, offset: deleteStart - extraSpaceLength },
                                    focus: { path: selection.anchor.path, offset: offset }
                                }
                            })

                            if (isInsertingAtBeginningOfNode) {
                                // Delete the space that was inserted at offset 0 of the original text node
                                try {
                                    Transforms.delete(editor, {
                                        at: {
                                            anchor: { path: selection.anchor.path, offset: 0 },
                                            focus: { path: selection.anchor.path, offset: 1 }
                                        }
                                    })
                                } catch (e) {
                                    console.log("Could not delete inserted space:", e)
                                }
                            }
                            
                            // Move cursor to the new verse's inline container if the verse was created successfully
                            if (newVersePath) {
                                const newInlineContainerPath = newVersePath.concat(1, 0)
                                Transforms.select(editor, Editor.start(editor, newInlineContainerPath))
                                // Delete the space that was inserted at the beginning if needed
                            }

                            console.log("tree:", editor.children)

                            return
                        }
                    }

                    // If either pattern matched, create the verse
                    if (verseNumber) {
                        const isCursorAtEndOfNode = offset >= currentNode[0].text.length
                        let extraSpaceLength = 0
                        if (isCursorAtEndOfNode) {
                            // workaround for inserting verse at the end of a paragraph, it should not wrap the next line into the same paragraph
                            const pointBeforeInsert = selection.anchor
                            Transforms.insertText(editor, " ")
                            Transforms.select(editor, pointBeforeInsert)
                            extraSpaceLength = 1
                        }

                        // Use the refactored function to create the verse and get the new verse path
                        const newVersePath = VerseTransforms.addVerseAtPoint(editor, selection.anchor, verseNumber)

                        // Delete the matched text
                        const deleteStart = offset - matchLength
                        Transforms.delete(editor, {
                            at: {
                                anchor: { path: selection.anchor.path, offset: deleteStart },
                                focus: { path: selection.anchor.path, offset: offset }
                            }
                        })

                        // Move cursor to the new verse's inline container if the verse was created successfully
                        if (newVersePath) {
                            const newInlineContainerPath = newVersePath.concat(1, 0)
                            Transforms.select(editor, Editor.start(editor, newInlineContainerPath))
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
