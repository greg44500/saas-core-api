import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { FormField } from '@/components/forms/form-field';
import { SelectField } from '@/components/forms/select-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  getCommercialInvitationBillingOptions,
  getCommercialInvitationPlanLabel,
  isEligibleCommercialInvitationPlan,
} from '@/features/commercial-invitation/lib/commercial-invitation';
import {
  commercialInvitationFormSchema,
} from '@/features/commercial-invitation/validation/commercial-invitation-schemas';

function CommercialInvitationForm({
  onCancel,
  onSubmit,
  pending = false,
  plans = [],
  submitError = null,
}) {
  const eligiblePlans = plans.filter(isEligibleCommercialInvitationPlan);
  const {
    formState: { errors },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(commercialInvitationFormSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email: '',
      planId: '',
      workspaceName: '',
      billingInterval: 'none',
      reason: '',
    },
  });

  const selectedPlanId = watch('planId');
  const selectedPlan = eligiblePlans.find(
    (plan) => plan.id === selectedPlanId,
  ) ?? null;
  const billingOptions = getCommercialInvitationBillingOptions(selectedPlan);

  useEffect(() => {
    if (!selectedPlan) {
      setValue('billingInterval', 'none');
      return;
    }

    const [defaultOption] = getCommercialInvitationBillingOptions(selectedPlan);
    if (defaultOption) {
      setValue('billingInterval', defaultOption.value, {
        shouldValidate: true,
      });
    }
  }, [selectedPlan, setValue]);

  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={handleSubmit(onSubmit)}
    >
      <FormField
        error={errors.email?.message}
        hint="L’adresse doit correspondre au compte utilisé lors de l’acceptation."
        id="commercial-invitation-email"
        label="Email du bénéficiaire"
      >
        <Input
          autoComplete="email"
          id="commercial-invitation-email"
          type="email"
          {...register('email')}
        />
      </FormField>

      <FormField
        error={errors.workspaceName?.message}
        hint="Ce workspace sera créé uniquement lors de l’acceptation."
        id="commercial-invitation-workspace-name"
        label="Nom du premier workspace"
      >
        <Input
          id="commercial-invitation-workspace-name"
          {...register('workspaceName')}
        />
      </FormField>

      <SelectField
        error={errors.planId?.message}
        hint="Seuls les Plans privés compatibles avec D-020 sont proposés."
        id="commercial-invitation-plan"
        label="Offre privée"
        options={eligiblePlans.map((plan) => ({
          value: plan.id,
          label: getCommercialInvitationPlanLabel(plan),
        }))}
        {...register('planId')}
      />

      {selectedPlan && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm">
          <p className="font-medium">{selectedPlan.name}</p>
          <p className="mt-1 text-muted-foreground">
            {selectedPlan.trialEnabled
              ? `Trial de ${selectedPlan.trialDurationDays} jour(s). Le paiement reste hors du parcours D-020.`
              : 'Accès privé gratuit sans échéance automatique.'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {selectedPlan.features?.length ?? 0} fonctionnalité(s) explicite(s) · {Object.keys(selectedPlan.limits ?? {}).length} limite(s)
          </p>
        </div>
      )}

      <SelectField
        disabled={!selectedPlan || billingOptions.length <= 1}
        error={errors.billingInterval?.message}
        id="commercial-invitation-billing-interval"
        label="Périodicité de référence"
        options={billingOptions}
        {...register('billingInterval')}
      />

      <FormField
        error={errors.reason?.message}
        hint="Motif interne conservé dans la traçabilité Platform et jamais affiché au bénéficiaire."
        id="commercial-invitation-reason"
        label="Motif administratif"
      >
        <Textarea
          id="commercial-invitation-reason"
          maxLength={500}
          placeholder="Ex. Programme bêta — septembre 2026"
          {...register('reason')}
        />
      </FormField>

      {eligiblePlans.length === 0 && (
        <p className="text-sm text-destructive" role="alert">
          Aucun Plan privé actif compatible n’est disponible. Créez ou configurez d’abord une offre privée dans Plans.
        </p>
      )}

      {submitError && (
        <p className="text-sm text-destructive" role="alert">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-3 pt-2">
        <Button
          disabled={pending}
          onClick={onCancel}
          type="button"
          variant="outline"
        >
          Annuler
        </Button>
        <Button
          disabled={pending || eligiblePlans.length === 0}
          type="submit"
        >
          {pending ? 'Envoi…' : 'Envoyer l’invitation'}
        </Button>
      </div>
    </form>
  );
}

export { CommercialInvitationForm };
