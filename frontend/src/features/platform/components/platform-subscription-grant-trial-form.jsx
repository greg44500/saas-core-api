import { useMemo, useState } from 'react';

import { SelectField } from '@/components/shared/select-field';
import { Button } from '@/components/ui/button';

const BILLING_INTERVAL_ITEMS = Object.freeze([
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'yearly', label: 'Annuelle' },
]);

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
      <SelectField
        disabled={pending || workspaces.length === 0}
        id="trial-workspace"
        items={workspaces.map((workspace) => ({
          value: workspace.id,
          label: workspace.name,
        }))}
        label="Workspace"
        onValueChange={setWorkspaceId}
        placeholder="Sélectionner un workspace"
        value={workspaceId}
      />

      <SelectField
        disabled={pending || eligiblePlans.length === 0}
        id="trial-plan"
        items={eligiblePlans.map((plan) => ({
          value: plan.id,
          label: plan.name,
        }))}
        label="Plan"
        onValueChange={setPlanId}
        placeholder="Sélectionner un plan"
        value={planId}
      />

      <SelectField
        disabled={pending}
        id="trial-billing"
        items={BILLING_INTERVAL_ITEMS}
        label="Périodicité"
        onValueChange={setBillingInterval}
        value={billingInterval}
      />

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
