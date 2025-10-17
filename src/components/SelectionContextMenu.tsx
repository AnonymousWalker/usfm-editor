import * as React from "react"
import { useSlate, ReactEditor } from "slate-react"
import { MyEditor } from "../plugins/helpers/MyEditor"
import { MyTransforms } from "../plugins/helpers/MyTransforms"
import Popper from "@material-ui/core/Popper"
import ClickAwayListener from "@material-ui/core/ClickAwayListener"
import MenuItem from "@material-ui/core/MenuItem"
import MenuList from "@material-ui/core/MenuList"
import Paper from "@material-ui/core/Paper"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import ListItemText from "@material-ui/core/ListItemText"
import AddIcon from "@material-ui/icons/Add"
import { Range, Editor, Path, Node, Element, Transforms } from "slate"
import NodeTypes from "../utils/NodeTypes"
import { verseNumber, emptyInlineContainer, emptyVerseWithVerseNumber } from "../transforms/basicSlateNodeFactory"

type SelectionContextMenuProps = {
    open: boolean
    handleClose: () => void
}

export const SelectionContextMenu: React.FC<SelectionContextMenuProps> = ({
    open,
    handleClose,
}: SelectionContextMenuProps) => {
    const editor = useSlate()
    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)

    React.useEffect(() => {
        if (!open || !editor.selection || Range.isCollapsed(editor.selection)) {
            setAnchorEl(null)
            return
        }

        // Get the DOM range for positioning the menu
        const domSelection = window.getSelection()
        if (domSelection && domSelection.rangeCount > 0) {
            const domRange = domSelection.getRangeAt(0)
            const rect = domRange.getBoundingClientRect()
            
            // Create a temporary element at the selection position for anchoring
            const tempEl = document.createElement("div")
            tempEl.style.position = "absolute"
            tempEl.style.left = `${rect.left}px`
            tempEl.style.top = `${rect.bottom}px`
            document.body.appendChild(tempEl)
            setAnchorEl(tempEl)

            return () => {
                document.body.removeChild(tempEl)
            }
        }
    }, [open, editor.selection])

    const handleConvertParagraphToVerse = () => {
        if (!editor.selection) return

        // Get the start of the selection
        const selectionStart = Range.isBackward(editor.selection)
            ? editor.selection.focus
            : editor.selection.anchor

        // Find the paragraph containing the selection
        const paragraphEntry = Editor.above(editor, {
            at: selectionStart.path,
            match: (n) => Element.isElement(n) && n.type === "p"
        })
        
        if (!paragraphEntry) return
        
        const [paragraph, paragraphPath] = paragraphEntry
        
        // Get the next verse number to use
        const chapterEntry = Editor.above(editor, {
            at: paragraphPath,
            match: (n) => Element.isElement(n) && n.type === NodeTypes.CHAPTER
        })
        
        if (!chapterEntry) return
        
        const [chapter] = chapterEntry
        let nextVerseNumber = 1
        
        // Find the last verse in the chapter to determine the next verse number
        for (let i = chapter.children.length - 1; i >= 0; i--) {
            const child = chapter.children[i]
            if (Element.isElement(child) && child.type === NodeTypes.VERSE) {
                const verseNumberStr = Node.string(child.children[0])
                const [rangeStart, rangeEnd] = verseNumberStr.split("-")
                const lastVerseNum = rangeEnd ? parseInt(rangeEnd) : parseInt(rangeStart)
                nextVerseNumber = lastVerseNum + 1
                break
            }
        }
        
        // Get the full text of the paragraph
        const paragraphText = Node.string(paragraph)
        
        // Replace the paragraph with a new verse containing the text
        MyTransforms.replaceNodes(editor, paragraphPath, emptyVerseWithVerseNumber(nextVerseNumber.toString()))
        
        // Insert the paragraph text into the new verse's inline container
        const newVersePath = paragraphPath
        const newInlineContainerPath = newVersePath.concat(1)
        MyTransforms.replaceText(
            editor,
            newInlineContainerPath.concat(0),
            paragraphText
        )
        
        // Move cursor to the start of the new verse content
        Transforms.select(editor, Editor.start(editor, newInlineContainerPath))
        
        handleClose()
        ReactEditor.focus(editor)
    }

    const handleConvertVerseContentToNewVerse = () => {
        if (!editor.selection) return

        // Get the start of the selection
        const selectionStart = Range.isBackward(editor.selection)
            ? editor.selection.focus
            : editor.selection.anchor

        // Find the verse containing the selection
        const verseEntry = MyEditor.getVerseNode(editor, selectionStart.path)
        if (!verseEntry) return
        
        const [sourceVerse, sourceVersePath] = verseEntry
        const sourceVerseNumberOrRange = Node.string(sourceVerse.children[0])
        const [sourceRangeStart, sourceRangeEnd] = sourceVerseNumberOrRange.split("-")
        
        // Calculate the new verse number
        const currentVerseNum = sourceRangeEnd ? parseInt(sourceRangeEnd) : parseInt(sourceRangeStart)
        const newVerseNum = currentVerseNum + 1
        
        // Get all text content from the verse (excluding the verse number)
        const verseTextContent = sourceVerse.children.slice(1).map(child => Node.string(child)).join('')
        
        // Replace the current verse with just the verse number and empty inline container
        MyTransforms.replaceNodes(editor, sourceVersePath, emptyVerseWithVerseNumber(sourceVerseNumberOrRange))
        
        // Insert the verse text into the inline container
        const sourceInlineContainerPath = sourceVersePath.concat(1)
        MyTransforms.replaceText(
            editor,
            sourceInlineContainerPath.concat(0),
            verseTextContent
        )
        
        // Create a new verse after this one with the selected text
        const newVersePath = Path.next(sourceVersePath)
        MyTransforms.replaceNodes(editor, newVersePath, emptyVerseWithVerseNumber(newVerseNum.toString()))
        
        // Insert the verse text into the new verse's inline container
        const newInlineContainerPath = newVersePath.concat(1)
        MyTransforms.replaceText(
            editor,
            newInlineContainerPath.concat(0),
            verseTextContent
        )
        
        handleClose()
        ReactEditor.focus(editor)
    }

    const handleAddVerse = () => {
        if (!editor.selection) return

        // Get the start of the selection
        const selectionStart = Range.isBackward(editor.selection)
            ? editor.selection.focus
            : editor.selection.anchor

        // Find the verse node at the selection start
        const verseEntry = MyEditor.getVerseNode(editor, selectionStart.path)
        
        // Check if the selection is actually within the verse (not just above it)
        const isSelectionWithinVerse = verseEntry && 
            (Path.isDescendant(selectionStart.path, verseEntry[1]) ||
            Path.equals(selectionStart.path, verseEntry[1]))
        
        
        if (!verseEntry || !isSelectionWithinVerse) {
            // If not within a verse, convert the paragraph to a verse
            handleConvertParagraphToVerse()
            return
        }

        // Check if the selection is within the inline container (index 1) or in a different part of the verse
        const [verse, versePath] = verseEntry
        const inlineContainerPath = versePath.concat(1)
        const isSelectionInInlineContainer = Path.isDescendant(selectionStart.path, inlineContainerPath)
        
        if (!isSelectionInInlineContainer) {
            // If selection is in a different part of the verse (like a paragraph), convert the entire verse
            handleConvertVerseContentToNewVerse()
            return
        }
        const verseNumberOrRange = Node.string(verse.children[0])
        const [rangeStart, rangeEnd] = verseNumberOrRange.split("-")
        
        // Get the inline container and its text content
        const [inlineContainer] = Editor.node(editor, inlineContainerPath)
        const fullVerseText = Node.string(inlineContainer)
        
        // Calculate the offset within the inline container where the selection starts
        const inlineContainerStart = Editor.start(editor, inlineContainerPath)
        const inlineContainerRange = Editor.range(editor, inlineContainerStart, selectionStart)
        const textBeforeSelectionStart = Editor.string(editor, inlineContainerRange)

        // Calculate the new verse number
        const currentVerseNum = rangeEnd ? parseInt(rangeEnd) : parseInt(rangeStart)
        const newVerseNum = currentVerseNum + 1

        // Split at the selection point, targeting the verse node
        Transforms.splitNodes(editor, {
            at: selectionStart,
            match: (n) => Element.isElement(n) && n.type === NodeTypes.VERSE,
        })

        // After the split, replace the verse number of the new verse
        const newVersePath = Path.next(versePath)
        const newVerseNumPath = newVersePath.concat(0)
        
        // Remove the old verse number node and insert a new one
        MyTransforms.replaceNodes(editor, newVerseNumPath, verseNumber(newVerseNum.toString()))

        // Move the text after the selection into the new verse's inline container,
        // and keep only the text before the selection in the original verse's inline container
        const originalInlineContainerPath = versePath.concat(1)
        const newInlineContainerPath = newVersePath.concat(1)

        // Reset both inline containers to empty, then insert the appropriate text
        const textAfterSelectionStart = fullVerseText.slice(textBeforeSelectionStart.length)
        
        MyTransforms.replaceNodes(editor, originalInlineContainerPath, emptyInlineContainer())
        MyTransforms.replaceNodes(editor, newInlineContainerPath, emptyInlineContainer())
        MyTransforms.replaceText(
            editor,
            originalInlineContainerPath.concat(0),
            textBeforeSelectionStart
        )
        MyTransforms.replaceText(
            editor,
            newInlineContainerPath.concat(0),
            textAfterSelectionStart
        )

        // Move cursor to the start of the new verse content
        Transforms.select(editor, Editor.start(editor, newInlineContainerPath))

        handleClose()
        ReactEditor.focus(editor)
    }

    if (!anchorEl || !open) return null

    return (
        <Popper
            anchorEl={anchorEl}
            open={open}
            placement="bottom-start"
            modifiers={{
                flip: { enabled: true },
                preventOverflow: {
                    enabled: true,
                    boundariesElement: "viewport",
                },
            }}
        >
            <ClickAwayListener onClickAway={handleClose}>
                <Paper>
                    <MenuList>
                        <MenuItem onClick={handleAddVerse}>
                            <ListItemIcon>
                                <AddIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Add Verse Marker" />
                        </MenuItem>
                    </MenuList>
                </Paper>
            </ClickAwayListener>
        </Popper>
    )
}

