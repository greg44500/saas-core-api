import { useWorkspaceContext } from '@/features/workspace/components/workspace-context';

function WorkspaceFeatureGate({ children, fallback = null, feature }) {
  const { hasFeature } = useWorkspaceContext();

  return hasFeature(feature) ? children : fallback;
}

export { WorkspaceFeatureGate };
