import { createContext, useContext, useMemo, useState } from 'react';

const DashboardDisplayPreviewContext = createContext(null);

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
  const context = useContext(DashboardDisplayPreviewContext);

  return context ?? {
    previewHiddenWidgetIds: null,
    setPreviewHiddenWidgetIds: () => {},
  };
}

export {
  DashboardDisplayPreviewProvider,
  useDashboardDisplayPreview,
};
