import { CheckCircle2, Palette } from 'lucide-react';

import { ThemeToggle } from '@/components/shared/theme-toggle';
import { Button } from '@/components/ui/button';

function App() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-5xl flex-col gap-8 px-6 py-10 sm:px-8 lg:px-10">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Palette aria-hidden="true" className="size-4" />
            Design system Core V1
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
              Fondations UI prêtes
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Tailwind CSS, shadcn/ui, Lucide, Inter et les tokens sémantiques
              clair/sombre sont intégrés sans introduire les responsabilités des
              lots suivants.
            </p>
          </div>
        </div>

        <ThemeToggle />
      </header>

      <section className="grid gap-4 md:grid-cols-2" aria-label="Aperçu du design system">
        <article className="rounded-lg border bg-card p-6 text-card-foreground">
          <div className="mb-4 flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="size-5 text-success" />
            <h2 className="text-xl font-semibold">Tokens sémantiques</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Les composants consomment les intentions visuelles du thème plutôt
            que des couleurs de marque écrites directement dans les features.
          </p>
        </article>

        <article className="rounded-lg border bg-muted p-6 text-foreground">
          <h2 className="mb-4 text-xl font-semibold">Primitive Button</h2>
          <div className="flex flex-wrap gap-3">
            <Button>Action principale</Button>
            <Button variant="secondary">Secondaire</Button>
            <Button variant="outline">Contour</Button>
            <Button variant="destructive">Destructif</Button>
          </div>
        </article>
      </section>
    </main>
  );
}

export default App;
