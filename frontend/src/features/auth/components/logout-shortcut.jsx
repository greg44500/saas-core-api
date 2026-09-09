import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router';

import { Tooltip } from '@/components/shared/tooltip';
import { Button } from '@/components/ui/button';
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
    <Tooltip content="Déconnexion" side="bottom-end">
      <Button
        aria-label="Déconnexion"
        disabled={isLoading}
        onClick={handleLogout}
        size="icon"
        type="button"
        variant="ghost"
      >
        <LogOut aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}

export { LogoutShortcut };
