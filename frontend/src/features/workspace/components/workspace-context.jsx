import { createContext, useContext } from 'react';

const WorkspaceContext = createContext(null);

function WorkspaceProvider({ children, workspace }) {
  return (
    <WorkspaceContext.Provider value={{ workspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error('useWorkspaceContext must be used inside WorkspaceProvider');
  }

  return context;
}

export { WorkspaceProvider, useWorkspaceContext };
