function PlatformSectionPlaceholderPage({ title, description }) {
  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
        Cette section est prête dans la navigation Platform. Son intégration métier sera réalisée dans un lot dédié.
      </div>
    </section>
  );
}

export { PlatformSectionPlaceholderPage };
