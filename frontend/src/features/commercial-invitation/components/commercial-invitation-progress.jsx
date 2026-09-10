import { ProgressStepper } from '@/components/shared/progress-stepper';

const COMMERCIAL_INVITATION_STEPS = Object.freeze([
  { id: 'account', label: 'Création du compte' },
  { id: 'login', label: 'Connexion' },
  { id: 'accept', label: 'Acceptation de l’offre' },
]);

function CommercialInvitationProgress({ currentStep }) {
  return (
    <ProgressStepper
      ariaLabel="Activation de votre accès privé"
      currentStep={currentStep}
      steps={COMMERCIAL_INVITATION_STEPS}
    />
  );
}

export {
  COMMERCIAL_INVITATION_STEPS,
  CommercialInvitationProgress,
};
