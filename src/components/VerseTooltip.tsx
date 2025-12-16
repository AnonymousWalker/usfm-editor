import * as React from "react"

type VerseTooltipProps = {
    anchorEl: HTMLElement | null
    open: boolean
    text?: string
}

export const VerseTooltip: React.FC<VerseTooltipProps> = ({
    anchorEl,
    open,
    text,
}: VerseTooltipProps) => {
    if (!open || !anchorEl || !text) return null

    const rect = anchorEl.getBoundingClientRect()

    const style: React.CSSProperties = {
        position: "fixed",
        top: rect.top + window.scrollY - 8,
        left: rect.left + rect.width / 2 + window.scrollX,
        transform: "translateX(-50%) translateY(-100%)",
    }

    return (
        <div className="usfm-editor-verse-tooltip" style={style}>
            {text}
        </div>
    )
}
