import * as React from "react"
import { useSlate, ReactEditor } from "slate-react"
import { Range } from "slate"
import { VerseTooltip } from "./VerseTooltip"
import { EditorContextMenuContext } from "./EditorContextMenuContext"

type EditorContextMenuProps = {
    anchorEl: HTMLElement | null
    open: boolean
    position?: { x: number; y: number }
}

type MenuAction = {
    id: string
    label: string
    shortcut?: string
    icon?: React.ReactNode
    onClick: () => void
}

export const EditorContextMenu: React.FC<EditorContextMenuProps> = ({
    anchorEl,
    open,
    position,
}: EditorContextMenuProps) => {
    const editor = useSlate()
    const [hoveredAction, setHoveredAction] = React.useState<string | null>(null)
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

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [open, hideContextMenu])

    if (!open) return null

    const handleActionClick = (action: MenuAction) => {
        action.onClick()
        hideContextMenu()
    }

    const actions: MenuAction[] = [
        {
            id: "add-verse",
            label: "Add Verse",
            shortcut: undefined,
            onClick: () => {
                // TODO: Implement add verse handler
            },
        },
        {
            id: "copy",
            label: "Copy",
            shortcut: "⌘C",
            onClick: () => {
                // TODO: Implement copy handler
            },
        },
        {
            id: "paste",
            label: "Paste",
            shortcut: "⌘V",
            onClick: () => {
                // TODO: Implement paste handler
            },
        },
        {
            id: "undo",
            label: "Undo",
            shortcut: "⌘Z",
            onClick: () => {
                // TODO: Implement undo handler
            },
        },
        {
            id: "redo",
            label: "Redo",
            shortcut: "⌘⇧Z",
            onClick: () => {
                // TODO: Implement redo handler
            },
        },
    ]

    const handleActionMouseEnter = (
        event: React.MouseEvent<HTMLButtonElement>,
        action: MenuAction
    ) => {
        setHoveredAction(action.id)
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

    const getTooltipText = (action: MenuAction): string => {
        if (action.shortcut) {
            return `${action.label} ${action.shortcut}`
        }
        return action.label
    }

    return (
        <>
            <div ref={menuRef} className="usfm-editor-context-menu" style={style}>
                {actions.map((action, index) => (
                    <React.Fragment key={action.id}>
                        {index > 0 && <div className="usfm-editor-context-menu-separator" />}
                        <button
                            className="usfm-editor-context-menu-button"
                            onMouseEnter={(e) => handleActionMouseEnter(e, action)}
                            onMouseLeave={handleActionMouseLeave}
                            onClick={() => handleActionClick(action)}
                        >
                            {action.icon && (
                                <span className="usfm-editor-context-menu-icon">
                                    {action.icon}
                                </span>
                            )}
                            <span className="usfm-editor-context-menu-label">
                                {action.label}
                            </span>
                        </button>
                    </React.Fragment>
                ))}
            </div>
            {hoveredAction && tooltipAnchor && (
                <VerseTooltip
                    anchorEl={tooltipAnchor}
                    open={true}
                    text={getTooltipText(actions.find((a) => a.id === hoveredAction)!)}
                />
            )}
        </>
    )
}

