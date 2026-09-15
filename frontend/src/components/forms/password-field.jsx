import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

function PasswordField({
  id,
  className,
  describedBy,
  invalid = false,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
  ...props
}) {
  const [visible, setVisible] = useState(false);
  const resolvedDescribedBy = ariaDescribedBy ?? describedBy;
  const resolvedInvalid = ariaInvalid ?? (invalid || undefined);

  return (
    <div className="relative">
      <Input
        aria-describedby={resolvedDescribedBy}
        aria-invalid={resolvedInvalid}
        className={cn('pr-11', className)}
        id={id}
        type={visible ? 'text' : 'password'}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 size-10"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  );
}

export { PasswordField };
