function FormField({ id, label, error, hint, children }) {
  const messageId = `${id}-message`;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {(error || hint) && (
        <p
          id={messageId}
          className={error ? 'text-sm text-destructive' : 'text-sm text-muted-foreground'}
          role={error ? 'alert' : undefined}
        >
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

export { FormField };
