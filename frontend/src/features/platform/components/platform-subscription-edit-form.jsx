import { useState } from 'react';

import { DatePicker } from '@/components/forms/date-picker';
import { SelectField } from '@/components/shared/select-field';
import { Button } from '@/components/ui/button';

const BILLING_INTERVAL_ITEMS = Object.freeze([
  { value: 'none', label: 'Aucune' },
  { value: 'monthly', label: 'Mensuelle' },
  { value: 'yearly', label: 'Annuelle' },
]);

const DISCOUNT_TYPE_ITEMS = Object.freeze([
  { value: 'none', label: 'Aucune' },
  { value: 'percentage', label: 'Pourcentage' },
  { value: 'fixed_amount', label: 'Montant fixe' },
]);

function toDateInputValue(value) {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return date.toISOString().slice(0, 10);
}

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
  const [discountEndsAt, setDiscountEndsAt] = useState(
    toDateInputValue(subscription.discountEndsAt),
  );

  function submit(event) {
    event.preventDefault();

    const discountEnabled = discountType !== 'none';
    const payload = {
      plan,
      billingInterval,
      discountType,
      discountValue: discountEnabled ? Number(discountValue || 0) : 0,
      discountReason: discountEnabled ? discountReason.trim() : null,
      discountEndsAt: discountEnabled && discountEndsAt ? discountEndsAt : null,
      manualOverride,
      manualOverrideReason: manualOverride ? manualOverrideReason.trim() : null,
    };

    onSubmit(payload);
  }

  const planItems = plans.map((item) => ({
    value: item.id,
    label: item.name,
    disabled: item.status !== 'active',
  }));

  return (
    <form className="space-y-5" onSubmit={submit}>
      <SelectField
        disabled={pending}
        id="subscription-plan"
        items={planItems}
        label="Plan"
        onValueChange={setPlan}
        value={plan}
      />

      <SelectField
        disabled={pending}
        id="subscription-billing"
        items={BILLING_INTERVAL_ITEMS}
        label="Périodicité"
        onValueChange={setBillingInterval}
        value={billingInterval}
      />

      <SelectField
        disabled={pending}
        id="subscription-discount-type"
        items={DISCOUNT_TYPE_ITEMS}
        label="Type de remise"
        onValueChange={setDiscountType}
        value={discountType}
      />

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
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="subscription-discount-end">Fin de la remise</label>
            <DatePicker
              disabled={pending}
              id="subscription-discount-end"
              onChange={setDiscountEndsAt}
              value={discountEndsAt}
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour une remise sans date d’expiration programmée.
            </p>
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

export { PlatformSubscriptionEditForm, toDateInputValue };
