import * as React from "react"

export type EditorContextMenuContextType = {
    showContextMenu: (anchorEl: HTMLElement | null, position?: { x: number; y: number }) => void
    hideContextMenu: () => void
}

export const EditorContextMenuContext =
    React.createContext<EditorContextMenuContextType>({
        showContextMenu: () => { },
        hideContextMenu: () => { },
    })

type EditorContextMenuProviderProps = {
    value: EditorContextMenuContextType
    children: React.ReactNode
}

export const EditorContextMenuProvider: React.FC<EditorContextMenuProviderProps> = ({
    value,
    children,
}: EditorContextMenuProviderProps) => (
    <EditorContextMenuContext.Provider value={value}>
        {children}
    </EditorContextMenuContext.Provider>
)

