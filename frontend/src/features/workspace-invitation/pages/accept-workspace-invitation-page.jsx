import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { Button } from '@/components/ui/button';
import { useListWorkspacesQuery } from '@/features/workspace/api/workspace-api';
import { useAcceptWorkspaceInvitationMutation } from '@/features/workspace-invitation/api/workspace-invitation-api';
import { workspaceInvitationTokenSchema } from '@/features/workspace-invitation/validation/workspace-invitation-schemas';

function AcceptWorkspaceInvitationPage() {
  const [searchParams] = useSearchParams();
  const [acceptedMembership, setAcceptedMembership] = useState(null);
  const tokenResult = workspaceInvitationTokenSchema.safeParse(searchParams.get('token') ?? '');
  const { data: workspaces = [] } = useListWorkspacesQuery();
  const [acceptInvitation, { isLoading, isError }] = useAcceptWorkspaceInvitationMutation();

  const fallbackPath = workspaces.length > 0 ? '/workspaces' : '/onboarding/workspace';
  const fallbackLabel = workspaces.length > 0 ? 'Voir mes workspaces' : 'Créer mon espace';

  const handleAccept = async () => {
    if (!tokenResult.success) {
      return;
    }

    try {
      const membership = await acceptInvitation(tokenResult.data).unwrap();
      setAcceptedMembership(membership);
    } catch {
      // L'état d'erreur de la mutation fournit le feedback générique ci-dessous.
    }
  };

  if (!tokenResult.success) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
        <section className="w-full max-w-lg space-y-4 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">Invitation invalide</h1>
            <p className="text-sm text-muted-foreground">
              Ce lien d’invitation n’est pas utilisable. Vous pouvez continuer depuis vos espaces disponibles.
            </p>
          </div>
          <Button asChild><Link to={fallbackPath}>{fallbackLabel}</Link></Button>
        </section>
      </main>
    );
  }

  if (acceptedMembership) {
    return (
      <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
        <section className="w-full max-w-lg space-y-5 rounded-xl border border-border bg-card p-6 text-card-foreground">
          <div className="space-y-2">
            <p className="text-sm font-medium text-primary">Invitation acceptée</p>
            <h1 className="text-2xl font-semibold tracking-tight">Vous avez rejoint le workspace</h1>
            <p className="text-sm text-muted-foreground">
              Votre membership est maintenant actif. L’abonnement reste celui du workspace rejoint.
            </p>
          </div>
          <Button asChild className="w-full">
            <Link to={`/workspaces/${acceptedMembership.workspaceId}/dashboard`}>
              Accéder au workspace
            </Link>
          </Button>
        </section>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center bg-muted/30 px-6 py-12">
      <section className="w-full max-w-lg space-y-6 rounded-xl border border-border bg-card p-6 text-card-foreground">
        <div className="space-y-2">
          <p className="text-sm font-medium text-primary">Invitation workspace</p>
          <h1 className="text-2xl font-semibold tracking-tight">Rejoindre cet espace</h1>
          <p className="text-sm text-muted-foreground">
            Confirmez l’acceptation de l’invitation. Aucun abonnement personnel ne vous sera demandé.
          </p>
        </div>

        {isError && (
          <div className="space-y-3" role="alert">
            <p className="text-sm text-destructive">
              Cette invitation est invalide, expirée ou n’est plus disponible.
            </p>
            <Button asChild variant="outline">
              <Link to={fallbackPath}>{fallbackLabel}</Link>
            </Button>
          </div>
        )}

        <Button className="w-full" type="button" onClick={handleAccept} disabled={isLoading}>
          {isLoading ? 'Acceptation…' : 'Accepter l’invitation'}
        </Button>
      </section>
    </main>
  );
}

export { AcceptWorkspaceInvitationPage };
