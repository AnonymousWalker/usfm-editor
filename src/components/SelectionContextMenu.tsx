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
import { Range, Editor, Path, Node, Element, Transforms, Point } from "slate"
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

    const addVerseAtSelection = (selection: Range) => {
        if (!selection) return

        // Get the start of the selection
        const selectionStart = Range.isBackward(selection)
            ? selection.focus
            : selection.anchor

        console.log("selection start", selectionStart)

        // Find the verse node and container information
        const verseInfo = getVerseAndContainerInfo(editor, selectionStart)
        if (!verseInfo) return

        const { verse, versePath, containerIndex, containerPath, containerText, textBeforeSelection, textAfterSelection } = verseInfo

        // Calculate the new verse number
        const newVerseNum = getNextVerseNumber(verse.children[0])
        // Transforms.insertNodes(editor, newVerse, { at: selectionStart.path })

        // Split the verse node at the selection point FIRST
        Transforms.splitNodes(editor, {
            at: selectionStart,
            match: (n) => Element.isElement(n) && n.type === NodeTypes.VERSE,
        })

        const newVersePath = Path.next(versePath)
        try {
            const [newVerse] = Editor.node(editor, newVersePath)
            // Create a "v" node with the verse number
            const verseMarkerNode = verseNumber(newVerseNum.toString())            
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
        } catch (error) {
            console.log("Could not get new verse at path:", newVersePath, "Error:", error)
        }
    }

    const handleAddVerse = () => {
        if (!editor.selection) return
        addVerseAtSelection(editor.selection)

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
                positionsToAdd.push(modifiedSelection)
            }
            
            // Call addVerseAtSelection for each position
            positionsToAdd.forEach(selection => {
                addVerseAtSelection(selection)
            })
            
            console.log(`Added ${paragraphBreaks} markers`)
        }        
        
        handleClose()
        ReactEditor.focus(editor)
    }

    // Helper function to get verse and container information
    const getVerseAndContainerInfo = (editor: Editor, selectionStart: Point) => {
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
    const getNextVerseNumber = (verseNumberNode: Node): number => {
        const verseNumberOrRange = Node.string(verseNumberNode)
        const [rangeStart, rangeEnd] = verseNumberOrRange.split("-")
        const currentVerseNum = rangeEnd ? parseInt(rangeEnd) : parseInt(rangeStart)
        return currentVerseNum + 1
    }

    // Helper function to get containers that should be moved to the new verse
    const getContainersForNewVerse = (editor: Editor, verse: Element, versePath: Path, containerIndex: number, textBeforeSelection: string, textAfterSelection: string): Node[] => {
        const containersToMove: Node[] = []
        
        if (containerIndex === 1) {
            // Selection is in inline container - create a new inline container with text after selection
            containersToMove.push({
                type: NodeTypes.INLINE_CONTAINER,
                children: [{ text: textAfterSelection }]
            })
        } else {
            // Selection is in paragraph or other element
            if (textBeforeSelection.trim() === "") {
                // Selection is at the beginning - move all containers from this point to end of verse
                for (let i = containerIndex; i < verse.children.length; i++) {
                    const containerPath = versePath.concat(i)
                    const [container] = Editor.node(editor, containerPath)
                    // Create a deep copy of the container
                    containersToMove.push(JSON.parse(JSON.stringify(container)))
                }
            } else {
                // Selection is in middle/end - create a paragraph with text after selection, then move subsequent containers
                containersToMove.push({
                    type: "p", // Paragraph type from UsfmMarkers
                    children: [{ text: textAfterSelection }]
                })
                
                // Add all subsequent containers
                for (let i = containerIndex + 1; i < verse.children.length; i++) {
                    const containerPath = versePath.concat(i)
                    const [container] = Editor.node(editor, containerPath)
                    // Create a deep copy of the container
                    containersToMove.push(JSON.parse(JSON.stringify(container)))
                }
            }
        }
        
        return containersToMove
    }

    // Helper function to determine content for the new verse
    const getContentForNewVerse = (editor: Editor, verse: Element, versePath: Path, containerIndex: number, textBeforeSelection: string, textAfterSelection: string, containerText: string): Node[] => {
        return getContainersForNewVerse(editor, verse, versePath, containerIndex, textBeforeSelection, textAfterSelection)
    }

    // Helper function to update the new verse content
    const updateNewVerseContent = (editor: Editor, versePath: Path, newVerseNum: number, containersForNewVerse: Node[]) => {
        const newVersePath = Path.next(versePath)
        const newVerseNumPath = newVersePath.concat(0)
        
        // Update verse number
        MyTransforms.replaceNodes(editor, newVerseNumPath, verseNumber(newVerseNum.toString()))
        
        // Remove the default inline container and replace with our structured content
        const newVerseInlineContainerPath = newVersePath.concat(1)
        Transforms.removeNodes(editor, { at: newVerseInlineContainerPath })
        
        // Insert all the containers for the new verse
        Transforms.insertNodes(editor, containersForNewVerse, { at: newVerseInlineContainerPath })
    }

    // Helper function to handle the original container content
    const handleOriginalContainerContent = (editor: Editor, containerPath: Path, containerIndex: number, textBeforeSelection: string, verse: Element, versePath: Path) => {
        if (containerIndex === 1) {
            // Selection was in inline container - update with text before selection
            MyTransforms.replaceNodes(editor, containerPath, emptyInlineContainer())
            MyTransforms.replaceText(editor, containerPath.concat(0), textBeforeSelection)
        } else {
            // Selection was in paragraph or other element
            if (textBeforeSelection.trim() === "") {
                // Remove all containers from this point to the end of the verse since all content moved to new verse
                removeContainersFromIndexToEnd(editor, versePath, containerIndex)
            } else {
                // Keep the text before selection in the original paragraph and remove subsequent containers
                MyTransforms.replaceText(editor, containerPath.concat(0), textBeforeSelection)
                removeContainersFromIndexToEnd(editor, versePath, containerIndex + 1)
            }
        }
    }

    // Helper function to remove all containers from a given index to the end of the verse
    const removeContainersFromIndexToEnd = (editor: Editor, versePath: Path, startIndex: number) => {
        // Get the current verse node to know how many children it has
        const [currentVerse] = Editor.node(editor, versePath)
        if (!Element.isElement(currentVerse)) return
        
        // Remove containers from the end to avoid path shifting issues
        for (let i = currentVerse.children.length - 1; i >= startIndex; i--) {
            const containerPath = versePath.concat(i)
            // Check if the path still exists before trying to remove it
            try {
                Editor.node(editor, containerPath)
                Transforms.removeNodes(editor, { at: containerPath })
            } catch (error) {
                // Path doesn't exist anymore, skip it
                console.warn(`Container at path ${containerPath} no longer exists, skipping removal`)
            }
        }
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

