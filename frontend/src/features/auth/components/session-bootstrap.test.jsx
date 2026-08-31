import { render } from '@testing-library/react';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshSession = vi.fn();

vi.mock('@/features/auth/api/auth-api', () => ({
  useRefreshSessionMutation: () => [refreshSession],
}));

import { SessionBootstrap } from '@/features/auth/components/session-bootstrap';

describe('SessionBootstrap', () => {
  beforeEach(() => {
    refreshSession.mockClear();
  });

  it('déclenche un seul refresh même sous StrictMode', () => {
    render(
      <StrictMode>
        <SessionBootstrap>
          <div>Application</div>
        </SessionBootstrap>
      </StrictMode>,
    );

    expect(refreshSession).toHaveBeenCalledTimes(1);
  });
});
