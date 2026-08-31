function PageLoader() {
  return (
    <div
      aria-live="polite"
      className="grid min-h-screen place-items-center bg-background px-6 text-foreground"
      role="status"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="size-4 animate-spin rounded-full border-2 border-muted border-t-primary" />
        Chargement…
      </div>
    </div>
  );
}

export { PageLoader };
