function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10 sm:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Politique de confidentialité
        </h1>
      </div>

      <section className="rounded-xl border border-warning/40 bg-warning/10 p-5">
        <h2 className="font-semibold">Document juridique à finaliser</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Le SaaS Core fournit le mécanisme de traçabilité de la prise de
          connaissance, mais le contenu de confidentialité doit être adapté au
          responsable de traitement et aux traitements réels de chaque
          application dérivée avant sa mise en production.
        </p>
      </section>
    </main>
  );
}

export { PrivacyPage };
