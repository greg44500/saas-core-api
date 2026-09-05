import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { useLazyGetAccountClosureImpactQuery } from '@/features/account/api/account-api';
import { AccountClosureDialog } from '@/features/account/components/account-closure-dialog';

function AccountClosureSection({ currentUserEmail = '' }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [impactError, setImpactError] = useState(null);
  const [loadClosureImpact, {
    data: closureImpact,
    isFetching: isLoadingImpact,
  }] = useLazyGetAccountClosureImpactQuery();

  const openClosureDialog = async () => {
    setImpactError(null);

    try {
      await loadClosureImpact(undefined, false).unwrap();
      setDialogOpen(true);
    } catch (error) {
      setImpactError(
        error?.data?.message
        ?? 'Impossible d’analyser les conséquences de la fermeture pour le moment.',
      );
    }
  };

  return (
    <section className="rounded-xl border border-destructive/40 bg-card p-5 text-card-foreground shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-destructive">Zone sensible</p>
        <h2 className="text-lg font-semibold">Fermer mon compte</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Cette action ferme votre accès à la plateforme. Avant toute confirmation, nous vous présenterons
          les conséquences réelles sur vos workspaces, vos appartenances et les autres membres concernés.
        </p>
      </div>

      {impactError && (
        <p className="mt-3 text-sm text-destructive" role="alert">{impactError}</p>
      )}

      <div className="mt-4">
        <Button
          disabled={isLoadingImpact}
          onClick={openClosureDialog}
          type="button"
          variant="destructive"
        >
          {isLoadingImpact ? 'Analyse des conséquences…' : 'Fermer mon compte'}
        </Button>
      </div>

      <AccountClosureDialog
        currentUserEmail={currentUserEmail}
        impact={closureImpact}
        onCancel={() => setDialogOpen(false)}
        open={dialogOpen}
      />
    </section>
  );
}

export { AccountClosureSection };
