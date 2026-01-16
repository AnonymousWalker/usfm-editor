import * as React from "react"
import { withReact, Slate, Editable, ReactEditor } from "slate-react"
import {
    createEditor,
    Transforms,
    Editor,
    Node,
    Range,
    Element,
    Descendant,
    NodeEntry,
    Path,
} from "slate"
import {
    renderElementByType,
    renderLeafByProps,
} from "../transforms/usfmRenderer"
import { usfmToSlate } from "../transforms/usfmToSlate"
import { withNormalize } from "../plugins/normalizeNode"
import {
    handleKeyPress,
    withBackspace,
    withDelete,
    withEnter,
    withVerseShortcut,
} from "../plugins/keyHandlers"
import {
    withInlineSuggestion,
    handleTabKeyForSuggestion,
    decorateWithSuggestion,
} from "../plugins/inlineSuggestion"
import { decorateWithPatternHighlight } from "../plugins/patternHighlight"
import { slateToUsfm } from "../transforms/slateToUsfm"
import { debounce, flowRight, isEqual } from "lodash"
import { MyTransforms } from "../plugins/helpers/MyTransforms"
import { SelectionTransforms } from "../plugins/helpers/SelectionTransforms"
import { VerseTransforms } from "../plugins/helpers/VerseTransforms"
import {
    parseIdentificationFromUsfm,
    filterInvalidIdentification,
    mergeIdentification,
    normalizeIdentificationValues,
} from "../transforms/identificationTransforms"
import { MyEditor } from "../plugins/helpers/MyEditor"
import {
    UsfmEditorRef,
    UsfmEditorProps,
    ForwardRefUsfmEditor,
    usfmEditorPropTypes,
    usfmEditorDefaultProps,
    Verse,
    IdentificationHeaders,
} from "../UsfmEditor"
import NodeRules from "../utils/NodeRules"
import { UsfmMarkers } from "../utils/UsfmMarkers"
import NodeTypes from "../utils/NodeTypes"
// import { SelectionContextMenu } from "./SelectionContextMenu"
import { VerseTooltip } from "./VerseTooltip"
import { VerseTooltipProvider } from "./VerseTooltipContext"
import { EditorContextMenu } from "./EditorContextMenu"
import { EditorContextMenuProvider } from "./EditorContextMenuContext"

export const createBasicUsfmEditor =
    (): ForwardRefUsfmEditor<BasicUsfmEditor> => {
        const e = React.forwardRef<BasicUsfmEditor, UsfmEditorProps>(
            ({ ...props }, ref) => <BasicUsfmEditor {...props} ref={ref} />
        )
        e.displayName = "BasicUsfmEditor"
        return e
    }

/**
 * A WYSIWYG editor component for USFM
 */
export class BasicUsfmEditor
    extends React.Component<UsfmEditorProps, BasicUsfmEditorState>
    implements UsfmEditorRef {
    public static propTypes = usfmEditorPropTypes
    public static defaultProps = usfmEditorDefaultProps

    slateEditor: ReactEditor

    constructor(props: UsfmEditorProps) {
        super(props)
        this.state = {
            value: usfmToSlate(props.usfmString),
            selectedVerse: undefined,
            prevUsfmStringProp: props.usfmString,
            // showSelectionMenu: false,
            verseTooltipAnchorEl: null,
            verseTooltipText: undefined,
            verseTooltipOpen: false,
            editorContextMenuOpen: false,
            editorContextMenuAnchorEl: null,
            editorContextMenuPosition: undefined,
        }

        this.slateEditor = flowRight(
            withBackspace,
            withDelete,
            withEnter,
            withVerseShortcut,
            withInlineSuggestion,
            withNormalize,
            withReact,
            createEditor
        )()
        this.slateEditor.isInline = () => false
    }

    // Since usfmString and goToVerse can be updated at the same time, we need to calculate the new
    // value before the editor renders. Once it renders, we can proceed.
    static getDerivedStateFromProps(
        props: UsfmEditorProps,
        state: BasicUsfmEditorState
    ): BasicUsfmEditorState | null {
        if (state.prevUsfmStringProp == props.usfmString) return null
        return {
            value: usfmToSlate(props.usfmString),
            prevUsfmStringProp: props.usfmString,
            // showSelectionMenu: false,
            verseTooltipAnchorEl: null,
            verseTooltipText: undefined,
            verseTooltipOpen: false,
            editorContextMenuOpen: false,
            editorContextMenuAnchorEl: null,
            editorContextMenuPosition: undefined,
        }
    }

    /* UsfmEditor interface functions */

    getMarksAtSelection = (): string[] => {
        if (!this.slateEditor.selection) return []
        const markObject = Editor.marks(this.slateEditor)
        if (!markObject) return []
        const markArray = Object.keys(markObject).filter(
            (k: string) => markObject[k] === true
        )
        return markArray
    }

    addMarkAtSelection = (mark: string): void => {
        if (!this.slateEditor.selection) return
        Editor.addMark(this.slateEditor, mark, true)
    }

    removeMarkAtSelection = (mark: string): void => {
        if (!this.slateEditor.selection) return
        Editor.removeMark(this.slateEditor, mark)
    }

    getParagraphTypesAtSelection = (): string[] => {
        if (!this.slateEditor.selection) return []
        let types: string[] = []
        for (const entry of Editor.nodes(this.slateEditor)) {
            const node = entry[0]
            if (
                Element.isElement(node) &&
                (UsfmMarkers.isParagraphType(node) ||
                    node.type == NodeTypes.INLINE_CONTAINER)
            ) {
                types = types.concat(node.type)
            }
        }
        return types
    }

    setParagraphTypeAtSelection = (marker: string): void => {
        if (!this.slateEditor.selection) return
        Transforms.setNodes(
            this.slateEditor,
            { type: marker },
            { match: NodeRules.isFormattableBlockType }
        )
    }

    goToVerse = (verseObject?: Verse): void => {
        if (!verseObject) return
        const { chapter, verse } = verseObject

        const versePath = MyEditor.findVersePath(
            this.slateEditor,
            chapter,
            verse
        )
        if (!versePath) return

        const [verseNode] = Editor.node(this.slateEditor, versePath)
        if (!Element.isElement(verseNode)) return

        const verseNumOrRange = Node.string(verseNode.children[0])

        const inlineContainerPath = versePath.concat(1)
        SelectionTransforms.moveToStartOfFirstLeaf(
            this.slateEditor,
            inlineContainerPath
        )
        ReactEditor.focus(this.slateEditor)

        if (
            !this.props.onVerseChange ||
            !this.didSelectedVerseChange(chapter, verseNumOrRange)
        ) {
            return
        }

        this.updateSelectedVerse(chapter, verseNumOrRange)
    }

    /* BasicUsfmEditor functions */

    handleChange: (value: Descendant[]) => void = (value) => {
        this.fixSelectionOnChapterOrVerseNumber()
        this.setState({ value: value }, () => {
            // Note: Selection menu state is updated in onMouseUp and onKeyUp
            // to avoid showing menu while dragging
            // COMMENTED OUT: SelectionContextMenu feature
        })
        this.scheduleOnChange(value)
    }

    // COMMENTED OUT: SelectionContextMenu feature
    // updateSelectionMenuState = (): void => {
    //     const selection = this.slateEditor.selection
    //     const hasExpandedSelection =
    //         !!selection && !Range.isCollapsed(selection)

    //     // Only show menu if there's an expanded selection in an editable area
    //     const shouldShow = hasExpandedSelection && !this.props.readOnly

    //     if (this.state.showSelectionMenu !== shouldShow) {
    //         this.setState({ showSelectionMenu: shouldShow })
    //     }
    // }

    // handleCloseSelectionMenu = (): void => {
    //     this.setState({ showSelectionMenu: false })
    // }

    showVerseTooltip = (anchorEl: HTMLElement, text: string): void => {
        this.setState({
            verseTooltipAnchorEl: anchorEl,
            verseTooltipText: text,
            verseTooltipOpen: true,
        })
    }

    hideVerseTooltip = (): void => {
        if (!this.state.verseTooltipOpen) return
        this.setState({ verseTooltipOpen: false })
    }

    showEditorContextMenu = (anchorEl: HTMLElement | null, position?: { x: number; y: number }): void => {
        this.setState({
            editorContextMenuOpen: true,
            editorContextMenuAnchorEl: anchorEl,
            editorContextMenuPosition: position,
        })
    }

    hideEditorContextMenu = (): void => {
        this.setState({
            editorContextMenuOpen: false,
            editorContextMenuAnchorEl: null,
            editorContextMenuPosition: undefined,
        })
    }

    onContextMenu = (event: React.MouseEvent<HTMLDivElement>): void => {
        if (this.props.readOnly) return

        event.preventDefault()
        const position = { x: event.clientX, y: event.clientY }
        this.showEditorContextMenu(null, position)
    }

    scheduleOnChange = debounce((newValue: Node[]) => {
        if (this.props.onChange) {
            const usfm = slateToUsfm(newValue)
            this.props.onChange(usfm)
        }
        if (this.props.onVerseChange) {
            // No need to keep track of selected chapter and verse if
            // onVerseChange is not given.
            this.updateSelectedVerseAfterEditorChange()
        }
    }, 200)

    onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
        // Handle Tab key for accepting suggestions
        if (handleTabKeyForSuggestion(event, this.slateEditor)) {
            return
        }
        handleKeyPress(event, this.slateEditor)
    }

    onMouseUp = (): void => {
        // Check for selection when mouse is released (after potential drag select)
        // COMMENTED OUT: SelectionContextMenu feature
        // setTimeout(() => this.updateSelectionMenuState(), 0)
    }

    onKeyUp = (): void => {
        // Check for selection after keyboard navigation (e.g., Shift+Arrow keys)
        // COMMENTED OUT: SelectionContextMenu feature
        // setTimeout(() => this.updateSelectionMenuState(), 0)
    }

    onDragOver = (event: React.DragEvent<HTMLDivElement>): void => {
        event.preventDefault()
        event.stopPropagation()
    }

    onDrop = (event: React.DragEvent<HTMLDivElement>): void => {
        if (this.props.readOnly) return

        event.preventDefault()

        try {
            // Retrieve the dragged verse path from the drag data
            const draggedVersePathData = event.dataTransfer.getData("text/plain")
            
            let draggedVersePath: Path | undefined = undefined

            if (draggedVersePathData) {
                try {
                    draggedVersePath = JSON.parse(draggedVersePathData) as Path
                } catch (error) {
                    console.debug("Failed to parse dragged verse path:", error)
                }
            }

            // Get the drop location from the event (similar to how clicking works)
            const dropRange = ReactEditor.findEventRange(this.slateEditor, event)

            if (dropRange) {
                // Set the cursor to the drop location first
                Transforms.select(this.slateEditor, dropRange)
                const newVersePath = VerseTransforms.addVerseAtSelection(this.slateEditor, dropRange)

                // Delete the original verse at draggedVersePath if it exists
                if (draggedVersePath && Editor.hasPath(this.slateEditor, draggedVersePath)) {
                    try {
                        VerseTransforms.deleteVerse(this.slateEditor, draggedVersePath)
                    } catch (error) {
                        console.debug("Failed to delete original verse after drag-and-drop:", error)
                    }
                }
            }
        } catch (error) {
            console.debug("Failed to handle verse drag-and-drop:", error)
        }
    }

    decorate = (entry: NodeEntry): Range[] => {
        const suggestionRanges = decorateWithSuggestion(this.slateEditor, entry)
        const patternRanges = decorateWithPatternHighlight(this.slateEditor, entry)
        return [...suggestionRanges, ...patternRanges]
    }

    fixSelectionOnChapterOrVerseNumber(): void {
        // const editor = this.slateEditor
        // const selection = editor.selection
        // if (!selection || !MyEditor.isVerseOrChapterNumberSelected(editor)) {
        //     return
        // }

        // console.debug("selection before correction: ", selection)

        // const anchorVersePath = MyEditor.getVerseNode(
        //     editor,
        //     selection.anchor.path
        // )?.[1]

        // if (Range.isCollapsed(selection) && anchorVersePath) {
        //     // This can happen when nodes get merged after the user presses delete at the
        //     // start of a verse. The solution is to move to the start of the inline container.
        //     SelectionTransforms.moveToStartOfFirstLeaf(
        //         editor,
        //         anchorVersePath.concat(1)
        //     )
        // } else if (Range.isBackward(selection)) {
        //     // There is currently no solution to the problem when the user selects backwards
        //     // through a verse number. Setting the focus to the start of the verse at which
        //     // the selection began seems reasonable, but it does not consistently work.
        //     Transforms.deselect(this.slateEditor)
        // } else if (Range.isForward(selection) && anchorVersePath) {
        //     // When the user selects forwards through a verse number, we need to set
        //     // the focus to the end of the verse at which they started the selection.
        //     // If the errant selection was the result of a double/triple click, we can be assured
        //     // that the user's selection came from the left (see the jsdoc for SelectionSeparator),
        //     // so we take the same action here.
        //     SelectionTransforms.moveToEndOfLastLeaf(editor, anchorVersePath, {
        //         edge: "focus",
        //     })
        // }
    }

    updateIdentificationFromProp = (): void => {
        if (!this.props.identification) return
        const current = MyEditor.identification(this.slateEditor)
        const validUpdates = this.filterAndNormalize(this.props.identification)
        const updated = mergeIdentification(current, validUpdates)

        if (!isEqual(updated, current)) {
            MyTransforms.setIdentification(this.slateEditor, updated)
            if (this.props.onIdentificationChange) {
                this.props.onIdentificationChange(updated)
            }
        }
    }

    updateIdentificationFromUsfm = (): void => {
        const parsedIdentification = parseIdentificationFromUsfm(
            this.props.usfmString
        )
        const validParsed = this.filterAndNormalize(parsedIdentification)

        MyTransforms.setIdentification(this.slateEditor, validParsed)
        if (this.props.onIdentificationChange) {
            this.props.onIdentificationChange(validParsed)
        }
    }

    updateIdentificationFromUsfmAndProp = (): void => {
        const parsedIdentification = parseIdentificationFromUsfm(
            this.props.usfmString
        )
        const validParsed = this.filterAndNormalize(parsedIdentification)
        const updateIdentification = this.props.identification ?? {}
        const validUpdates = this.filterAndNormalize(updateIdentification)
        const updated = mergeIdentification(validParsed, validUpdates)

        MyTransforms.setIdentification(this.slateEditor, updated)
        if (this.props.onIdentificationChange) {
            this.props.onIdentificationChange(updated)
        }
    }

    filterAndNormalize = (
        ids: IdentificationHeaders
    ): IdentificationHeaders => {
        const filtered = filterInvalidIdentification(ids)
        return normalizeIdentificationValues(filtered)
    }

    updateSelectedVerseAfterEditorChange = (): void => {
        if (!this.slateEditor.selection) return

        const verseNodeEntry = MyEditor.getVerseNode(this.slateEditor)
        if (!verseNodeEntry) return

        const [verseNode] = verseNodeEntry
        const chapterNode = MyEditor.getChapterNode(this.slateEditor)?.[0]
        if (!Element.isElement(chapterNode) || !Element.isElement(verseNode))
            return

        const chapterNum = parseInt(Node.string(chapterNode.children[0]))
        const verseNumOrRangeStr = Node.string(verseNode.children[0])

        if (this.didSelectedVerseChange(chapterNum, verseNumOrRangeStr)) {
            this.updateSelectedVerse(chapterNum, verseNumOrRangeStr)
        }
    }

    updateSelectedVerse(chapter: number, verseNumOrRange: string): void {
        const { verseStart, verseEnd } = getVerseStartAndEnd(verseNumOrRange)
        const newSelectedVerse = {
            chapter: chapter,
            verse: verseStart,
        }
        this.setState({ selectedVerse: newSelectedVerse })

        if (!this.props.onVerseChange) return
        this.props.onVerseChange({
            chapter,
            verseStart,
            verseEnd,
        })
    }

    didSelectedVerseChange(chapter: number, verseNumOrRange: string): boolean {
        const { verseStart } = getVerseStartAndEnd(verseNumOrRange)
        const newSelectedVerse = {
            chapter: chapter,
            verse: verseStart,
        }
        return !isEqual(newSelectedVerse, this.state.selectedVerse)
    }

    componentDidMount(): void {
        this.updateIdentificationFromUsfmAndProp()
        if (this.props.goToVerse) {
            this.goToVerse(this.props.goToVerse)
        }
    }

    componentDidUpdate(prevProps: UsfmEditorProps): void {
        if (
            prevProps.usfmString != this.props.usfmString &&
            prevProps.identification != this.props.identification
        ) {
            this.updateIdentificationFromUsfmAndProp()
        } else if (prevProps.identification != this.props.identification) {
            this.updateIdentificationFromProp()
        } else if (prevProps.usfmString != this.props.usfmString) {
            this.updateIdentificationFromUsfm()
        }

        if (prevProps.usfmString != this.props.usfmString) {
            Transforms.deselect(this.slateEditor)
        }

        if (!isEqual(prevProps.goToVerse, this.props.goToVerse)) {
            this.goToVerse(this.props.goToVerse)
        }
    }

    render(): JSX.Element {
        // The selection may be invalid if the slate value is updated by an external source,
        // e.g. when the usfmString property just changed.
        if (
            this.slateEditor.selection &&
            isInvalidRange(this.slateEditor.selection, this.state.value)
        ) {
            Transforms.deselect(this.slateEditor)
        }
        return (
            <VerseTooltipProvider
                value={{
                    showTooltip: this.showVerseTooltip,
                    hideTooltip: this.hideVerseTooltip,
                }}
            >
                <EditorContextMenuProvider
                    value={{
                        showContextMenu: this.showEditorContextMenu,
                        hideContextMenu: this.hideEditorContextMenu,
                    }}
                >
                    <Slate
                        editor={this.slateEditor}
                        value={this.state.value}
                        onChange={this.handleChange}
                    >
                        <Editable
                            readOnly={this.props.readOnly}
                            renderElement={renderElementByType}
                            renderLeaf={renderLeafByProps}
                            decorate={this.decorate}
                            spellCheck={false}
                            onKeyDown={this.onKeyDown}
                            onKeyUp={this.onKeyUp}
                            onMouseUp={this.onMouseUp}
                            onDragOver={this.onDragOver}
                            onDrop={this.onDrop}
                            onContextMenu={this.onContextMenu}
                            className={"usfm-editor"}
                        />
                        {/* COMMENTED OUT: SelectionContextMenu feature */}
                        {/* <SelectionContextMenu
                            open={this.state.showSelectionMenu}
                            handleClose={this.handleCloseSelectionMenu}
                        /> */}
                        <VerseTooltip
                            anchorEl={this.state.verseTooltipAnchorEl}
                            open={this.state.verseTooltipOpen}
                            text={this.state.verseTooltipText}
                        />
                        <EditorContextMenu
                            anchorEl={this.state.editorContextMenuAnchorEl}
                            open={this.state.editorContextMenuOpen}
                            position={this.state.editorContextMenuPosition}
                        />
                    </Slate>
                </EditorContextMenuProvider>
            </VerseTooltipProvider>
        )
    }
}

interface BasicUsfmEditorState {
    value: Descendant[]
    selectedVerse?: Verse
    prevUsfmStringProp: string
    // showSelectionMenu: boolean
    verseTooltipAnchorEl: HTMLElement | null
    verseTooltipText?: string
    verseTooltipOpen: boolean
    editorContextMenuOpen: boolean
    editorContextMenuAnchorEl: HTMLElement | null
    editorContextMenuPosition?: { x: number; y: number }
}

interface VerseStartAndEnd {
    verseStart: number
    verseEnd: number
}

function getVerseStartAndEnd(verseNumOrRange: string): VerseStartAndEnd {
    if (verseNumOrRange == "front") return { verseStart: 0, verseEnd: 0 }

    const [startVerseStr, endVerseStrOrNull] = verseNumOrRange.split("-")
    const verseStart = parseInt(startVerseStr)
    const verseEnd = parseInt(endVerseStrOrNull) || verseStart
    return { verseStart, verseEnd }
}

function isInvalidRange(range: Range, nodes: Node[]): boolean {
    const anchorPath = range.anchor.path
    const focusPath = range.focus.path
    return (
        nodes.length <= Math.min(anchorPath[0], focusPath[0]) ||
        !Node.has(nodes[anchorPath[0]], anchorPath.slice(1)) ||
        !Node.has(nodes[focusPath[0]], focusPath.slice(1))
    )
}
