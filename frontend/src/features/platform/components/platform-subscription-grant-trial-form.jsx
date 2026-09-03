import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';

function PlatformSubscriptionGrantTrialForm({
  onCancel,
  onSubmit,
  pending,
  plans,
  submitError,
  workspaces,
}) {
  const eligiblePlans = useMemo(
    () => plans.filter((plan) => plan.status === 'active' && plan.trialEnabled === true),
    [plans],
  );

  const [workspaceId, setWorkspaceId] = useState(workspaces[0]?.id ?? '');
  const [planId, setPlanId] = useState(eligiblePlans[0]?.id ?? '');
  const [billingInterval, setBillingInterval] = useState('monthly');

  function submit(event) {
    event.preventDefault();
    if (!workspaceId || !planId) return;
    onSubmit({ workspaceId, planId, billingInterval });
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="trial-workspace">Workspace</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="trial-workspace"
          onChange={(event) => setWorkspaceId(event.target.value)}
          required
          value={workspaceId}
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="trial-plan">Plan</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="trial-plan"
          onChange={(event) => setPlanId(event.target.value)}
          required
          value={planId}
        >
          {eligiblePlans.map((plan) => (
            <option key={plan.id} value={plan.id}>{plan.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="trial-billing">Périodicité</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="trial-billing"
          onChange={(event) => setBillingInterval(event.target.value)}
          value={billingInterval}
        >
          <option value="monthly">Mensuelle</option>
          <option value="yearly">Annuelle</option>
        </select>
      </div>

      {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}
      {eligiblePlans.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun plan actif éligible au trial.</p>
      )}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending || eligiblePlans.length === 0 || !workspaceId} type="submit">Accorder le trial</Button>
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">Annuler</Button>
      </div>
    </form>
  );
}

export { PlatformSubscriptionGrantTrialForm };
