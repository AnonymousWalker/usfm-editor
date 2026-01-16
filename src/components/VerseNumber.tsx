import * as React from "react"
import {
    useRef,
    forwardRef,
    useContext,
    useCallback,
} from "react"
import { numberClassNames } from "../transforms/usfmRenderer"
import { Node, Element, Editor } from "slate"
import { useSlate, ReactEditor } from "slate-react"
import { SelectionSeparator } from "./SelectionSeparator"
import { VerseTooltipContext } from "./VerseTooltipContext"
import { MyEditor } from "../plugins/helpers/MyEditor"
import NodeTypes from "../utils/NodeTypes"

type VerseNumberProps = {
    element: Node
    children: React.ReactNode[]
}

export const VerseNumber: React.FC<VerseNumberProps> = forwardRef(
    ({ ...props }: VerseNumberProps, ref: React.Ref<HTMLElement>) => {
        const verseNumberText = Node.string(props.element).trim()

        return (
            <React.Fragment>
                <sup
                    {...props}
                    ref={ref}
                    contentEditable={false}
                    draggable={!!verseNumberText && verseNumberText !== "front"}
                    className={`usfm-marker-v usfm-editor-no-select ${numberClassNames(
                        props.element
                    )}`}
                >
                    {props.children}
                </sup>
                <SelectionSeparator />
            </React.Fragment>
        )
    }
)

VerseNumber.displayName = "VerseNumber"

function withVerseTooltip<P extends VerseNumberProps>(
    VerseNum: React.FC<P>
) {
    const fc = function (props: P) {
        const verseNumberRef = useRef<HTMLElement>(null)
        const { showTooltip, hideTooltip } = useContext(VerseTooltipContext)
        const editor = useSlate()

        // Get the verse number text from the element
        const verseNumberText = Node.string(props.element).trim()

        const handleMouseEnter = useCallback(() => {
            if (!verseNumberRef.current || !verseNumberText) return

            // Use setTimeout to avoid interfering with Slate's click handling
            setTimeout(() => {
                if (!verseNumberRef.current) return

                // Find the parent verse node to check if it's empty
                let isVerseEmpty = false
                try {
                    // Get the path directly from the Slate node element
                    const verseNumberPath = ReactEditor.findPath(editor, props.element)

                    // Verify the path is valid
                    if (!Editor.hasPath(editor, verseNumberPath)) {
                        return
                    }
                    const verseNodeEntry = MyEditor.getVerseNode(
                        editor,
                        verseNumberPath
                    )

                    if (
                        verseNodeEntry &&
                        Element.isElement(verseNodeEntry[0]) &&
                        verseNodeEntry[0].type === NodeTypes.VERSE
                    ) {
                        isVerseEmpty =
                            Node.string(verseNodeEntry[0]).trim() ===
                            Node.string(verseNodeEntry[0].children[0]).trim()
                    }
                } catch (error) {
                    // If we can't find the verse node, default to not empty
                    // Silently fail - this can happen during editor updates or when clicking
                    return
                }

                // Only show tooltip for empty verses
                if (!isVerseEmpty) return

                showTooltip(verseNumberRef.current, `Verse ${verseNumberText} is missing content`)
            }, 0)
        }, [editor, props.element, verseNumberText, showTooltip])

        const handleMouseLeave = useCallback(() => {
            hideTooltip()
        }, [hideTooltip])

        const handleDragStart = useCallback((event: React.DragEvent<HTMLElement>) => {
            // Prevent Slate from processing the drag event on contentEditable={false} elements
            event.stopPropagation()
            // Set drag effect for visual feedback
            event.dataTransfer.effectAllowed = "move"

            // Store the verse path in the drag data
            try {
                const verseNumberPath = ReactEditor.findPath(editor, props.element)
                const verseNodeEntry = MyEditor.getVerseNode(editor, verseNumberPath)

                if (verseNodeEntry) {
                    const [, versePath] = verseNodeEntry
                    // Store the path as a JSON string
                    event.dataTransfer.setData("text/plain", JSON.stringify(versePath.concat(0))) // path to the verse number leaf
                }
            } catch (error) {
                // Silently fail if we can't find the verse path
                console.log("Failed to store verse path on drag start:", error)
            }
        }, [editor, props.element])

        const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
            event.preventDefault()
            event.stopPropagation()
        }, [])

        return (
            <VerseNum
                {...props}
                ref={verseNumberRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onDragStart={handleDragStart}
                onClick={handleClick}
            />
        )
    }
    fc.displayName = (VerseNum.displayName ?? "") + "WithVerseTooltip"
    return fc
}

export const VerseNumberWithVerseMenu = withVerseTooltip(VerseNumber)
