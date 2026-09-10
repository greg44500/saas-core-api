import { createContext, useContext, useMemo, useState } from 'react';

const DashboardDisplayPreviewContext = createContext(null);
const EMPTY_PREVIEW_CONTEXT = Object.freeze({
  previewHiddenWidgetIds: null,
  setPreviewHiddenWidgetIds: () => {},
});

function DashboardDisplayPreviewProvider({ children }) {
  const [previewHiddenWidgetIds, setPreviewHiddenWidgetIds] = useState(null);
  const value = useMemo(() => ({
    previewHiddenWidgetIds,
    setPreviewHiddenWidgetIds,
  }), [previewHiddenWidgetIds]);

  return (
    <DashboardDisplayPreviewContext.Provider value={value}>
      {children}
    </DashboardDisplayPreviewContext.Provider>
  );
}

/**
 * Le preview est un état purement local à la surface courante : il permet de
 * voir l'effet des switches sans persister une préférence ni créer de droit.
 */
function useDashboardDisplayPreview() {
  return useContext(DashboardDisplayPreviewContext) ?? EMPTY_PREVIEW_CONTEXT;
}

export {
  DashboardDisplayPreviewProvider,
  useDashboardDisplayPreview,
};
