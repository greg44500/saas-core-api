import { createContext, useContext, useMemo } from 'react';

const WorkspaceContext = createContext(null);

function WorkspaceProvider({ children, membership, permissions, workspace }) {
  const value = useMemo(() => {
    const permissionSet = new Set(permissions ?? []);

    return {
      workspace,
      membership,
      permissions: [...permissionSet],
      can: (permission) => permissionSet.has(permission),
      canAny: (requiredPermissions) =>
        requiredPermissions.some((permission) => permissionSet.has(permission)),
      canAll: (requiredPermissions) =>
        requiredPermissions.every((permission) => permissionSet.has(permission)),
    };
  }, [membership, permissions, workspace]);

  return (
    <WorkspaceContext.Provider value={value}>
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
