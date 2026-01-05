import * as React from "react"
import { useSlate, ReactEditor } from "slate-react"
import { Range } from "slate"
import { VerseTooltip } from "./VerseTooltip"
import { EditorContextMenuContext } from "./EditorContextMenuContext"
import AddIcon from "@mui/icons-material/Add"
import FileCopyIcon from "@mui/icons-material/FileCopy"
import AssignmentIcon from "@mui/icons-material/Assignment"
import UndoIcon from "@mui/icons-material/Undo"
import RedoIcon from "@mui/icons-material/Redo"

type EditorContextMenuProps = {
    anchorEl: HTMLElement | null
    open: boolean
    position?: { x: number; y: number }
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
    anchorEl,
    open,
    position,
}: EditorContextMenuProps) => {
    const editor = useSlate()
    const [hoveredAction, setHoveredAction] = React.useState<{ label: string; shortcut?: string } | null>(null)
    const [tooltipAnchor, setTooltipAnchor] = React.useState<HTMLElement | null>(null)
    const menuRef = React.useRef<HTMLDivElement>(null)
    const { hideContextMenu } = React.useContext(EditorContextMenuContext)

    React.useEffect(() => {
        if (!open) return

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                hideContextMenu()
            }
        }

        // Add event listener after a delay to avoid immediate closure from the right-click event
        const timeoutId = setTimeout(() => {
            document.addEventListener("mousedown", handleClickOutside)
        }, 100)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open, hideContextMenu])

    if (!open) return null

    const handleAddVerse = () => {
        // TODO: Implement add verse handler
        hideContextMenu()
    }

    const handleCopy = () => {
        // TODO: Implement copy handler
        hideContextMenu()
    }

    const handlePaste = () => {
        // TODO: Implement paste handler
        hideContextMenu()
    }

    const handleUndo = () => {
        // TODO: Implement undo handler
        hideContextMenu()
    }

    const handleRedo = () => {
        // TODO: Implement redo handler
        hideContextMenu()
    }

    const handleActionMouseEnter = (
        event: React.MouseEvent<HTMLButtonElement>,
        label: string,
        shortcut?: string
    ) => {
        setHoveredAction({ label, shortcut })
        setTooltipAnchor(event.currentTarget)
    }

    const handleActionMouseLeave = () => {
        setHoveredAction(null)
        setTooltipAnchor(null)
    }

    // Helper function to create positioning style from coordinates
    const createPositionStyle = (x: number, y: number): React.CSSProperties => ({
        position: "fixed",
        top: y + window.scrollY - 8,
        left: x + window.scrollX,
        transform: "translateX(-5%) translateY(-100%)",
    })

    // Calculate position from editor cursor (selection)
    const getCursorPosition = (): React.CSSProperties | null => {
        // Priority 1: Get position from editor cursor
        if (editor.selection) {
            try {
                const cursorPoint = Range.isCollapsed(editor.selection)
                    ? editor.selection.anchor
                    : editor.selection.focus

                const cursorRange = {
                    anchor: cursorPoint,
                    focus: cursorPoint,
                }
                const cursorDomRange = ReactEditor.toDOMRange(editor, cursorRange)
                const cursorRect = cursorDomRange.getBoundingClientRect()
                return createPositionStyle(cursorRect.left, cursorRect.top)
            } catch {
                // Fallback to DOM selection if ReactEditor conversion fails
                const domSelection = window.getSelection()
                if (domSelection && domSelection.rangeCount > 0) {
                    const rect = domSelection.getRangeAt(0).getBoundingClientRect()
                    return createPositionStyle(rect.left, rect.top)
                }
            }
        }

        // Priority 2: Use mouse position if provided
        if (position) {
            return createPositionStyle(position.x, position.y)
        }

        // Priority 3: Use anchor element position
        if (anchorEl) {
            const rect = anchorEl.getBoundingClientRect()
            return createPositionStyle(rect.left, rect.top)
        }

        return null
    }

    const style = getCursorPosition()
    if (!style) return null

    const getTooltipText = (label: string, shortcut?: string): string => {
        if (shortcut) {
            return `${label} ${shortcut}`
        }
        return label
    }

    return (
        <>
            <div ref={menuRef} className="usfm-editor-context-menu" style={style}>
                <button
                    className="usfm-editor-context-menu-button"
                    onMouseEnter={(e) => handleActionMouseEnter(e, "Add Verse")}
                    onMouseLeave={handleActionMouseLeave}
                    onClick={handleAddVerse}
                >
                    <span className="usfm-editor-context-menu-icon">
                        <AddIcon fontSize="small" />
                    </span>
                    <span className="usfm-editor-context-menu-label">
                        Add Verse
                    </span>
                </button>
                <div className="usfm-editor-context-menu-separator" />
                <button
                    className="usfm-editor-context-menu-button"
                    onMouseEnter={(e) => handleActionMouseEnter(e, "Copy", "⌘C")}
                    onMouseLeave={handleActionMouseLeave}
                    onClick={handleCopy}
                >
                    <span className="usfm-editor-context-menu-icon">
                        <FileCopyIcon fontSize="small" />
                    </span>
                </button>
                <button
                    className="usfm-editor-context-menu-button"
                    onMouseEnter={(e) => handleActionMouseEnter(e, "Paste", "⌘V")}
                    onMouseLeave={handleActionMouseLeave}
                    onClick={handlePaste}
                >
                    <span className="usfm-editor-context-menu-icon">
                        <AssignmentIcon fontSize="small" />
                    </span>
                </button>
                <div className="usfm-editor-context-menu-separator" />
                <button
                    className="usfm-editor-context-menu-button"
                    onMouseEnter={(e) => handleActionMouseEnter(e, "Undo", "⌘Z")}
                    onMouseLeave={handleActionMouseLeave}
                    onClick={handleUndo}
                >
                    <span className="usfm-editor-context-menu-icon">
                        <UndoIcon fontSize="small" />
                    </span>
                </button>
                <button
                    className="usfm-editor-context-menu-button"
                    onMouseEnter={(e) => handleActionMouseEnter(e, "Redo", "⌘⇧Z")}
                    onMouseLeave={handleActionMouseLeave}
                    onClick={handleRedo}
                >
                    <span className="usfm-editor-context-menu-icon">
                        <RedoIcon fontSize="small" />
                    </span>
                </button>
            </div>
            {hoveredAction && tooltipAnchor && (
                <VerseTooltip
                    anchorEl={tooltipAnchor}
                    open={true}
                    text={getTooltipText(hoveredAction.label, hoveredAction.shortcut)}
                />
            )}
        </>
    )
}

