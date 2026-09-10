function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-6 py-10 sm:px-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          Conditions générales d’utilisation
        </h1>
      </div>

      <section className="rounded-xl border border-warning/40 bg-warning/10 p-5">
        <h2 className="font-semibold">Document juridique à finaliser</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Le SaaS Core fournit le mécanisme d’acceptation et de versionnement,
          mais le contenu contractuel doit être rédigé et validé pour chaque
          application dérivée avant son ouverture au public.
        </p>
      </section>
    </main>
  );
}

export { TermsPage };
