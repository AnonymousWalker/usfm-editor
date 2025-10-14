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
import { verseNumber } from "../transforms/basicSlateNodeFactory"

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

    const handleAddVerse = () => {
        if (!editor.selection) return

        // Get the start of the selection
        const selectionStart = Range.isBackward(editor.selection)
            ? editor.selection.focus
            : editor.selection.anchor

        // Find the verse node at the selection start
        const verseEntry = MyEditor.getVerseNode(editor, selectionStart.path)
        if (!verseEntry) return

        const [verse, versePath] = verseEntry
        const verseNumberOrRange = Node.string(verse.children[0])
        const [rangeStart, rangeEnd] = verseNumberOrRange.split("-")
        
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

        // Move cursor to the start of the new verse content
        const newInlineContainerPath = newVersePath.concat(1)
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

