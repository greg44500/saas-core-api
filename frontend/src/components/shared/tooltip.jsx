function Tooltip({ children, content }) {
  if (!content) return children;

  return (
    <span className="group relative inline-flex">
      {children}
      <span
        className="pointer-events-none absolute bottom-full left-1/2 z-[120] mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
}

export { Tooltip };
