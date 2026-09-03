import { useState } from 'react';

import { Button } from '@/components/ui/button';

function PlatformSubscriptionEditForm({
  onCancel,
  onSubmit,
  pending,
  plans,
  subscription,
  submitError,
}) {
  const [plan, setPlan] = useState(subscription.plan?.id ?? '');
  const [billingInterval, setBillingInterval] = useState(subscription.billingInterval ?? 'none');
  const [manualOverride, setManualOverride] = useState(Boolean(subscription.manualOverride));
  const [manualOverrideReason, setManualOverrideReason] = useState(subscription.manualOverrideReason ?? '');
  const [discountType, setDiscountType] = useState(subscription.discountType ?? 'none');
  const [discountValue, setDiscountValue] = useState(String(subscription.discountValue ?? 0));
  const [discountReason, setDiscountReason] = useState(subscription.discountReason ?? '');

  function submit(event) {
    event.preventDefault();

    const payload = {
      plan,
      billingInterval,
      discountType,
      discountValue: Number(discountValue || 0),
      discountReason: discountType === 'none' ? null : discountReason.trim(),
      manualOverride,
      manualOverrideReason: manualOverride ? manualOverrideReason.trim() : null,
    };

    onSubmit(payload);
  }

  return (
    <form className="space-y-5" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="subscription-plan">Plan</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="subscription-plan"
          onChange={(event) => setPlan(event.target.value)}
          value={plan}
        >
          {plans.map((item) => (
            <option disabled={item.status !== 'active'} key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="subscription-billing">Périodicité</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="subscription-billing"
          onChange={(event) => setBillingInterval(event.target.value)}
          value={billingInterval}
        >
          <option value="none">Aucune</option>
          <option value="monthly">Mensuelle</option>
          <option value="yearly">Annuelle</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="subscription-discount-type">Type de remise</label>
        <select
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          id="subscription-discount-type"
          onChange={(event) => setDiscountType(event.target.value)}
          value={discountType}
        >
          <option value="none">Aucune</option>
          <option value="percentage">Pourcentage</option>
          <option value="fixed_amount">Montant fixe</option>
        </select>
      </div>

      {discountType !== 'none' && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="subscription-discount-value">Valeur de la remise</label>
            <input className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" id="subscription-discount-value" min="1" onChange={(event) => setDiscountValue(event.target.value)} type="number" value={discountValue} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="subscription-discount-reason">Motif de la remise</label>
            <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" id="subscription-discount-reason" maxLength={500} onChange={(event) => setDiscountReason(event.target.value)} required value={discountReason} />
          </div>
        </>
      )}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input checked={manualOverride} onChange={(event) => setManualOverride(event.target.checked)} type="checkbox" />
        Dérogation administrative
      </label>

      {manualOverride && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="subscription-override-reason">Motif de la dérogation</label>
          <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" id="subscription-override-reason" maxLength={500} onChange={(event) => setManualOverrideReason(event.target.value)} required value={manualOverrideReason} />
        </div>
      )}

      {submitError && <p className="text-sm text-destructive" role="alert">{submitError}</p>}

      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} type="submit">Enregistrer</Button>
        <Button disabled={pending} onClick={onCancel} type="button" variant="outline">Annuler</Button>
      </div>
    </form>
  );
}

export { PlatformSubscriptionEditForm };
