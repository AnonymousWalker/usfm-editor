import { Transforms, Editor, Path, Element, Range, Point } from "slate"
import { MyTransforms } from "./MyTransforms"
import { MyEditor } from "./MyEditor"
import { Node } from "slate"
import { range } from "lodash"
import {
    emptyVerseWithVerseNumber,
    textNode,
    verseNumber,
    emptyInlineContainer,
} from "../../transforms/basicSlateNodeFactory"
import NodeRules from "../../utils/NodeRules"
import NodeTypes from "../../utils/NodeTypes"

export const VerseTransforms = {
    joinWithPreviousVerse,
    unjoinVerses,
    removeVerseAndConcatenateContentsWithPrevious,
    addVerse,
    addVerseAtSelection,
    addVerseAtPoint,
    getNextVerseNumber,
}

function joinWithPreviousVerse(editor: Editor, path: Path): void {
    const thisVerseNodeEntry = MyEditor.getVerseNode(editor, path)
    const previousVerseEntry = MyEditor.getPreviousVerse(editor, path)
    if (!thisVerseNodeEntry || !previousVerseEntry) return

    const [thisVerse, thisVersePath] = thisVerseNodeEntry
    const [prevVerse, prevVersePath] = previousVerseEntry
    const thisVerseNumPath = thisVersePath.concat(0)
    const prevVerseNumPath = prevVersePath.concat(0)

    const thisNumOrRange = Node.string(thisVerse.children[0])
    const prevNumOrRange = Node.string(prevVerse.children[0])
    const [thisStart, thisEndOrNull] = thisNumOrRange.split("-")
    const thisEnd = thisEndOrNull ? thisEndOrNull : thisStart
    const [prevStart, _prevEnd] = prevNumOrRange.split("-")

    _insertLeadingSpaceIfNecessary(editor, thisVersePath)
    Transforms.removeNodes(editor, { at: thisVerseNumPath })
    MyTransforms.replaceNodes(
        editor,
        prevVerseNumPath,
        verseNumber(`${prevStart}-${thisEnd}`)
    )
    Transforms.mergeNodes(editor, { at: thisVersePath })
    MyTransforms.moveToEndOfLastLeaf(editor, prevVersePath)
}

function removeVerseAndConcatenateContentsWithPrevious(
    editor: Editor,
    path: Path
): void {
    const thisVerseEntry = MyEditor.getVerseNode(editor, path)
    if (!thisVerseEntry) return

    const [_thisVerse, thisVersePath] = thisVerseEntry
    const thisVerseNumPath = thisVersePath.concat(0)

    _insertLeadingSpaceIfNecessary(editor, thisVersePath)
    Transforms.removeNodes(editor, { at: thisVerseNumPath })
    Transforms.mergeNodes(editor, { at: thisVersePath })
    MyTransforms.moveToEndOfLastLeaf(editor, Path.previous(thisVersePath))
}

function unjoinVerses(editor: Editor, path: Path): void {
    const thisVerseEntry = MyEditor.getVerseNode(editor, path)
    if (!thisVerseEntry) return

    const [verse, versePath] = thisVerseEntry
    const verseNumPath = versePath.concat(0)
    const verseRange = Node.string(verse.children[0])
    const [thisStart, thisEnd] = verseRange.split("-")

    // Use replaceNodes() rather than replaceText() so that the
    // verse number is re-rendered, triggering effect hooks.
    MyTransforms.replaceNodes(editor, verseNumPath, verseNumber(thisStart))

    const newVerses = range(
        parseInt(thisStart) + 1,
        parseInt(thisEnd) + 1,
        1
    ).map((num) => emptyVerseWithVerseNumber(num.toString()))
    Transforms.insertNodes(editor, newVerses, { at: Path.next(versePath) })
    MyTransforms.moveToEndOfLastLeaf(editor, Path.next(versePath))
}

function addVerse(editor: Editor, path: Path): void {
    const thisVerseEntry = MyEditor.getVerseNode(editor, path)
    if (!thisVerseEntry) return

    const [verse, versePath] = thisVerseEntry
    const verseNumPath = versePath.concat(0)
    const verseNumberOrRange = Node.string(verse.children[0])
    const [rangeStart, rangeEnd] = verseNumberOrRange.split("-")
    const newVerseNum = rangeEnd
        ? parseInt(rangeEnd) + 1
        : parseInt(rangeStart) + 1

    const newVerse = emptyVerseWithVerseNumber(newVerseNum.toString())
    Transforms.insertNodes(editor, newVerse, { at: Path.next(versePath) })
    MyTransforms.moveToEndOfLastLeaf(editor, Path.next(versePath))
    // Replace the original verse number with a clone of itself,
    // forcing the verse number to be re-rendered which will
    // trigger its effect hooks.
    MyTransforms.replaceNodes(
        editor,
        verseNumPath,
        verseNumber(verseNumberOrRange)
    )
}

function addVerseAtSelection(editor: Editor, selection: Range, newVerseNum?: string): Path | null {
    if (!selection) return null

    // Get the start of the selection
    let selectionStart = Range.isBackward(selection)
        ? selection.focus
        : selection.anchor

    // Calculate the new verse number from the current verse if not provided
    let verseNumber: string
    if (newVerseNum !== undefined) {
        verseNumber = newVerseNum
    } else {
        const verseNodeEntry = MyEditor.getVerseNode(editor, selectionStart.path)
        if (!verseNodeEntry) return null
        
        const [verse] = verseNodeEntry
        verseNumber = getNextVerseNumber(verse.children[0]).toString()
    }

    // If the cursor is at the beginning of the current text node, insert a space at the selection
    let insertedSpace = false
    if (selectionStart.offset === 0) {
        insertedSpace = true
        Transforms.select(editor, selectionStart)
        Transforms.insertText(editor, " ")
        // Move cursor one position to the right after inserting the space
        const pointAfterInsert: Point = { path: selectionStart.path, offset: selectionStart.offset + 1 }
        Transforms.select(editor, pointAfterInsert)
        // Update selectionStart for the subsequent addVerseAtPoint call
        selectionStart = pointAfterInsert
    }

    // Call the main function with the selection start point and verse number
    const result = addVerseAtPoint(editor, selectionStart, verseNumber)
    
    // If we inserted a space, remove it now
    if (insertedSpace) {
        const originalPoint: Point = { path: selectionStart.path, offset: 0 }
        Transforms.delete(editor, {
            at: {
                anchor: originalPoint,
                focus: { path: selectionStart.path, offset: 1 }
            }
        })
    }
    
    return result
}

function addVerseAtPoint(editor: Editor, point: Point, verseNumberStr: string): Path | null {
    if (!point) return null

    console.log("point", point)

    // Find the verse node and container information
    const verseInfo = getVerseAndContainerInfo(editor, point)
    if (!verseInfo) return null

    const { verse, versePath, containerIndex, containerPath, containerText, textBeforeSelection, textAfterSelection } = verseInfo

    // Check if the cursor is at the end of the editor where splitNodes would have no effect
    const isAtEndOfEditor = isCursorAtEndOfEditor(editor, point)
    
    if (isAtEndOfEditor) {
        // Simply add an empty verse at the end
        const newVerse = emptyVerseWithVerseNumber(verseNumberStr)
        const newVersePath = Path.next(versePath)
        Transforms.insertNodes(editor, newVerse, { at: newVersePath })
        MyTransforms.moveToEndOfLastLeaf(editor, newVersePath)
        return newVersePath
    }

    // Split the verse node at the selection point FIRST
    Transforms.splitNodes(editor, {
        at: point,
        match: (n) => Element.isElement(n) && n.type === NodeTypes.VERSE,
    })

    const newVersePath = Path.next(versePath)
    try {
        const [newVerse] = Editor.node(editor, newVersePath)
        // Create a "v" node with the verse number
        const verseMarkerNode = verseNumber(verseNumberStr)            
        Transforms.insertNodes(editor, verseMarkerNode, { at: newVersePath.concat(0) })
        
        /* 
        Check if the first child is of type "p". This is because after splitting nodes, the part after the split will have the same node type as the original.
        For a verse text, it should be in an inline container. If the split yields a "p" node, we need to move the text to the inline container and remove the "p" node.
        */
        const firstChildIsP = Array.isArray(newVerse.children) && newVerse.children.length > 0 && newVerse.children[0].type === "p"
        if (firstChildIsP && Array.isArray(newVerse.children)) {
            const firstPNode = newVerse.children[0]
            if (Array.isArray(firstPNode.children) && firstPNode.children.length > 0) {
                const firstChild = firstPNode.children[0]
                if ('text' in firstChild && firstChild.text) {
                    const extractedText = firstChild.text
                    
                    const [insertedVerse] = Editor.node(editor, newVersePath)
                    
                    // Find the inlineContainer and update its first child's text
                    if (Array.isArray(insertedVerse.children)) {
                        const inlineContainer = insertedVerse.children.find(child => child.type === "inlineContainer")
                        if (inlineContainer && Array.isArray(inlineContainer.children) && inlineContainer.children.length > 0) {
                            const inlineFirstChild = inlineContainer.children[0]
                            if ('text' in inlineFirstChild) {
                                // Update the text content using insertText
                                const targetPath = newVersePath.concat([1, 0]) // Path to inlineContainer's first child
                                
                                // First select the text node, then insert the new text
                                Transforms.select(editor, targetPath)
                                Transforms.insertText(editor, extractedText)
                                
                                // Remove the first "p" node after inserting its text
                                const firstPNodePath = newVersePath.concat([2]) // Path to the first "p" node (index 2)
                                Transforms.removeNodes(editor, { at: firstPNodePath })
                            }
                        }
                    }
                }
            }
        }
        
        return newVersePath
    } catch (error) {
        console.log("Could not get new verse at path:", newVersePath, "Error:", error)
        return null
    }
}

// Helper function to get verse and container information
function getVerseAndContainerInfo(editor: Editor, selectionStart: Point) {
    const verseEntry = MyEditor.getVerseNode(editor, selectionStart.path)
    if (!verseEntry) return null

    const [verse, versePath] = verseEntry

    let containerIndex = -1
    let containerPath: Path | null = null
    
    for (let i = 1; i < verse.children.length; i++) {
        const childPath = versePath.concat(i)
        
        if (Path.isDescendant(selectionStart.path, childPath) || Path.equals(selectionStart.path, childPath)) {
            containerIndex = i
            containerPath = childPath
            break
        }
    }
    
    if (containerPath === null) {
        console.error("Could not find container for selection within verse")
        return null
    }
    
    const [container] = Editor.node(editor, containerPath)
    const containerText = Node.string(container)
    
    const containerStartPoint = Editor.start(editor, containerPath)
    const preRange = Editor.range(editor, containerStartPoint, selectionStart)
    const textBeforeSelection = Editor.string(editor, preRange)
    const textAfterSelection = containerText.slice(textBeforeSelection.length)

    return {
        verse,
        versePath,
        containerIndex,
        containerPath,
        containerText,
        textBeforeSelection,
        textAfterSelection
    }
}

// Helper function to calculate the next verse number
function getNextVerseNumber(verseNumberNode: Node): number {
    const verseNumberOrRange = Node.string(verseNumberNode)
    const [rangeStart, rangeEnd] = verseNumberOrRange.split("-")
    const currentVerseNum = rangeEnd ? parseInt(rangeEnd) : parseInt(rangeStart)
    return currentVerseNum + 1
}

// Helper function to check if cursor is at the end of the editor where splitNodes would have no effect
function isCursorAtEndOfEditor(editor: Editor, point: Point): boolean {
    // Get the verse node at the cursor position
    const verseEntry = MyEditor.getVerseNode(editor, point.path)
    if (!verseEntry) return false
    
    const [verse, versePath] = verseEntry
    
    // Check if the cursor is at the very end of the verse's text content
    const verseEnd = Editor.end(editor, versePath)
    
    // If the cursor is at the end of the verse, splitNodes would have no effect
    return Point.equals(point, verseEnd)
}

/**
 * When a verse (verse N) is about to be joined to its preceding verse
 * (verse N-1), we check whether the inline container of verse N is
 * 1) nonempty and 2) mergeable into the last node of verse N-1.
 * If these two conditions are met, a space will be inserted at the
 * beginning of verse N's inline container.
 */
function _insertLeadingSpaceIfNecessary(editor: Editor, versePath: Path) {
    const inlineContainerPath = versePath.concat(1)
    const [inlineContainer, _icPath] = Editor.node(editor, inlineContainerPath)
    const inlineContainerText = Node.string(inlineContainer)
    if (!inlineContainerText.trim()) {
        return
    }

    const previousVerseEntry = MyEditor.getPreviousVerse(
        editor,
        inlineContainerPath
    )
    if (!previousVerseEntry) return

    const [prevVerse, prevVersePath] = previousVerseEntry
    if (!Element.isElement(prevVerse)) return

    const [lastChildOfPreviousVerse, _lcPath] = Editor.node(
        editor,
        prevVersePath.concat(prevVerse.children.length - 1)
    )

    if (NodeRules.canMergeAIntoB(inlineContainer, lastChildOfPreviousVerse)) {
        _insertLeadingSpace(editor, inlineContainerPath)
    }
}

function _insertLeadingSpace(
    editor: Editor,
    path: Path // Path of a node whose children are text nodes
) {
    const [node, _path] = Editor.node(editor, path)
    const currentText = Node.string(node)
    if (currentText.trim()) {
        Transforms.insertNodes(editor, textNode(" "), { at: path.concat(0) })
    }
}
