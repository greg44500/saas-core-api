import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function WorkspacePermissionGate({
  allOf = [],
  anyOf = [],
  children,
  fallback = null,
  permission,
}) {
  const { can, canAll, canAny } = useWorkspaceContext();

  const isAllowed = permission
    ? can(permission)
    : allOf.length > 0
      ? canAll(allOf)
      : anyOf.length > 0
        ? canAny(anyOf)
        : true;

  return isAllowed ? children : fallback;
}

export { WorkspacePermissionGate };
