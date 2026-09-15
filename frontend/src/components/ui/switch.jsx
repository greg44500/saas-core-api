import { Switch as BaseSwitch } from '@base-ui/react/switch';

import { cn } from '@/lib/utils';

function Switch({
  checked = false,
  className,
  disabled = false,
  onCheckedChange,
  ...props
}) {
  const handleCheckedChange = (nextChecked) => {
    onCheckedChange?.(nextChecked);
  };

  return (
    <BaseSwitch.Root
      checked={checked}
      className={cn(
        'inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'data-checked:bg-primary data-unchecked:bg-muted',
        'data-disabled:cursor-not-allowed data-disabled:opacity-50',
        className,
      )}
      data-slot="switch"
      disabled={disabled}
      nativeButton
      onCheckedChange={handleCheckedChange}
      render={<button type="button" />}
      {...props}
    >
      <BaseSwitch.Thumb
        className={cn(
          'pointer-events-none block size-5 rounded-full bg-background shadow-sm transition-transform',
          'data-checked:translate-x-5 data-unchecked:translate-x-0',
        )}
        data-slot="switch-thumb"
      />
    </BaseSwitch.Root>
  );
}

export { Switch };
