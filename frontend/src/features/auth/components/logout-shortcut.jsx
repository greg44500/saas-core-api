import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useLogoutMutation } from '@/features/auth/api/auth-api';

function LogoutShortcut() {
  const navigate = useNavigate();
  const [logout, { isLoading }] = useLogoutMutation();

  async function handleLogout() {
    try {
      await logout().unwrap();
    } finally {
      navigate('/login', { replace: true });
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            aria-label="Déconnexion"
            disabled={isLoading}
            onClick={handleLogout}
            size="icon"
            type="button"
            variant="ghost"
          />
        )}
      >
        <LogOut aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent align="end" side="bottom">
        Déconnexion
      </TooltipContent>
    </Tooltip>
  );
}

export { LogoutShortcut };
