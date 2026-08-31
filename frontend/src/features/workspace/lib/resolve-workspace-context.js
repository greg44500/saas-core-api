function resolveWorkspaceContext(workspaces) {
  const usableWorkspaces = Array.isArray(workspaces) ? workspaces : [];

  if (usableWorkspaces.length === 0) {
    return { type: 'onboarding' };
  }

  if (usableWorkspaces.length === 1) {
    return {
      type: 'workspace',
      workspaceId: usableWorkspaces[0].id,
    };
  }

  return {
    type: 'selection',
    workspaces: usableWorkspaces,
  };
}

export { resolveWorkspaceContext };
