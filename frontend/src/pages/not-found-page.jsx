import { Link } from 'react-router';

import { Button } from '@/components/ui/button';

function NotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-background px-6 text-foreground">
      <section className="max-w-lg text-center">
        <p className="text-sm font-semibold text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold">Page introuvable</h1>
        <p className="mt-3 text-muted-foreground">
          La page demandée n’existe pas ou n’est plus disponible.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Retour à l’accueil</Link>
        </Button>
      </section>
    </main>
  );
}

export { NotFoundPage };
