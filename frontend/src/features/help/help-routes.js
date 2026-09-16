const CORE_HELP_FRONTEND_ROUTE_MODULE = Object.freeze({
  workspaceRoutes: Object.freeze([
    {
      path: 'help/:entryId?',
      lazy: async () => {
        const { WorkspaceHelpPage } = await import(
          '@/features/help/pages/workspace-help-page'
        );
        return { Component: WorkspaceHelpPage };
      },
    },
  ]),
  platformRoutes: Object.freeze([
    {
      path: 'help/:entryId?',
      lazy: async () => {
        const { PlatformHelpPage } = await import(
          '@/features/help/pages/platform-help-page'
        );
        return { Component: PlatformHelpPage };
      },
    },
  ]),
});

export { CORE_HELP_FRONTEND_ROUTE_MODULE };
