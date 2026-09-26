import { createContext, useContext } from 'react'

export const FoldSplitDepthContext = createContext(0)

export function useFoldSplitDepth() {
  return useContext(FoldSplitDepthContext)
}

/** Two equal panes. Nested splits stay single-column so menus are not doubled. */
export default function FoldSplit({ menu, detail }) {
  const depth = useFoldSplitDepth()

  return (
    <FoldSplitDepthContext.Provider value={depth + 1}>
      <div className="fold-split">
        <div className="fold-split-pane">{menu}</div>
        <div className="fold-hinge-gap" aria-hidden="true" />
        <div className="fold-split-pane">{detail}</div>
      </div>
    </FoldSplitDepthContext.Provider>
  )
}
