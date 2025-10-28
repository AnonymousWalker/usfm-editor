import * as React from "react"
import { useSlate, ReactEditor } from "slate-react"
import { Editor, Transforms } from "slate"
import { MyEditor } from "../plugins/helpers/MyEditor"
import Popper from "@material-ui/core/Popper"
import ClickAwayListener from "@material-ui/core/ClickAwayListener"
import MenuItem from "@material-ui/core/MenuItem"
import MenuList from "@material-ui/core/MenuList"
import Paper from "@material-ui/core/Paper"
import ListItemIcon from "@material-ui/core/ListItemIcon"
import ListItemText from "@material-ui/core/ListItemText"
import AddIcon from "@material-ui/icons/Add"
import { Range } from "slate"
import { VerseTransforms } from "../plugins/helpers/VerseTransforms"

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
        const newVersePath = VerseTransforms.addVerseAtSelection(editor, editor.selection)

        // Move cursor to the new verse's inline container if the verse was created successfully
        if (newVersePath) {
            Transforms.select(editor, Editor.start(editor, newVersePath.concat(0)))
            // Use requestAnimationFrame to ensure the DOM updates before focusing
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    ReactEditor.focus(editor)
                    Transforms.select(editor, Editor.start(editor, newVersePath.concat(0)))
                })
            })
        }

        handleClose()
        ReactEditor.focus(editor)

    }

    const handleAutoFillMarkers = () => {
        if (!editor.selection) return
        
        // Calculate paragraph breaks based on the difference in the third index of anchor and focus paths
        const anchorPath = editor.selection.anchor.path
        const focusPath = editor.selection.focus.path
        
        console.log("anchor path:", anchorPath)
        console.log("focus path:", focusPath)
        
        // Check if both paths have at least 3 elements (third index is index 2)
        if (anchorPath.length >= 3 && focusPath.length >= 3) {
            const anchorThirdIndex = anchorPath[2]
            const focusThirdIndex = focusPath[2]
            const paragraphBreaks = Math.abs(anchorThirdIndex - focusThirdIndex)
            
            console.log(`Third index - Anchor: ${anchorThirdIndex}, Focus: ${focusThirdIndex}`)
            console.log(`Paragraph breaks: ${paragraphBreaks}`)
            
            // Determine the direction (ascending or descending)
            const isAscending = focusThirdIndex > anchorThirdIndex
            const startIndex = isAscending ? anchorThirdIndex : focusThirdIndex
            const endIndex = isAscending ? focusThirdIndex : anchorThirdIndex
            
            const positionsToAdd = []

            // Generate selections for each increment
            for (let i = startIndex; i <= endIndex; i++) {
                const modifiedSelection = {
                    ...editor.selection,
                    anchor: {
                        ...editor.selection.anchor,
                        path: [...anchorPath.slice(0, 2), i, ...anchorPath.slice(3)],
                        offset: 0
                    },
                    focus: {
                        ...editor.selection.focus,
                        path: [...focusPath.slice(0, 2), i, ...focusPath.slice(3)],
                        offset: 0
                    }
                }

                // Only add to positionsToAdd if the parent node has type === 'p'
                try {
                    const parentPath = [...anchorPath.slice(0, 2), i]
                    const [parentNode] = Editor.node(editor, parentPath)
                    if (parentNode && 'type' in parentNode && parentNode.type === 'p') {
                        positionsToAdd.push(modifiedSelection)
                    }
                } catch (_) {
                    // Skip this position if we can't access the parent node
                }
            }

            console.log("positions to add:", JSON.stringify(positionsToAdd, null, 2))
            
            // Get the starting verse number from the selection start point
            const selectionStartPoint = isAscending ? editor.selection.anchor : editor.selection.focus
            const verseNodeEntry = MyEditor.getVerseNode(editor, selectionStartPoint.path)
            if (verseNodeEntry) {
                const [verse] = verseNodeEntry
                const currentVerseNum = VerseTransforms.getNextVerseNumber(verse.children[0])
                
                // Call addVerseAtSelection for each position in reverse order (bottom up)
                // with decreasing verse numbers, so that it doesn't affect the verse above
                positionsToAdd.reverse().forEach((pos, index) => {
                    const verseNum = (currentVerseNum + positionsToAdd.length - index - 1).toString()
                    VerseTransforms.addVerseAtSelection(editor, pos, verseNum)
                })
                
                console.log(`Added ${paragraphBreaks} markers`)
            }
            
        }        
        
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
                        <MenuItem onClick={handleAutoFillMarkers}>
                            <ListItemIcon>
                                <AddIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary="Suggest Markers" />
                        </MenuItem>
                    </MenuList>
                </Paper>
            </ClickAwayListener>
        </Popper>
    )
}

