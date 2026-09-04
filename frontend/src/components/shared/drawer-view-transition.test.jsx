import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DrawerViewTransition } from '@/components/shared/drawer-view-transition';


describe('DrawerViewTransition', () => {
  beforeEach(() => {
    vi.stubGlobal('requestAnimationFrame', (callback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('utilise une transition courte et respecte reduced motion', () => {
    render(
      <DrawerViewTransition viewKey="list">
        <p>Contenu</p>
      </DrawerViewTransition>,
    );

    const wrapper = screen.getByText('Contenu').parentElement;
    expect(wrapper).toHaveClass('duration-200');
    expect(wrapper).toHaveClass('ease-out');
    expect(wrapper).toHaveClass('motion-reduce:transition-none');
    expect(wrapper).toHaveClass('transform-gpu');
  });
});
