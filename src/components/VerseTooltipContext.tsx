import * as React from "react"

export type VerseTooltipContextType = {
    showTooltip: (anchorEl: HTMLElement, text: string) => void
    hideTooltip: () => void
}

export const VerseTooltipContext =
    React.createContext<VerseTooltipContextType>({
        showTooltip: () => { },
        hideTooltip: () => { },
    })

type VerseTooltipProviderProps = {
    value: VerseTooltipContextType
    children: React.ReactNode
}

export const VerseTooltipProvider: React.FC<VerseTooltipProviderProps> = ({
    value,
    children,
}: VerseTooltipProviderProps) => (
    <VerseTooltipContext.Provider value={value}>
        {children}
    </VerseTooltipContext.Provider>
)
