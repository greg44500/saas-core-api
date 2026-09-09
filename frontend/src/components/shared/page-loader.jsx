function PageLoader() {
  return (
    <div
      aria-live="polite"
      className="grid min-h-screen place-items-center bg-background px-6 text-foreground"
      role="status"
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span
          aria-hidden="true"
          className="size-4 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none"
        />
        Chargement…
      </div>
    </div>
  );
}

export { PageLoader };
