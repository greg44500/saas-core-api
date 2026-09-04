import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DrawerViewTransition } from '@/components/shared/drawer-view-transition';


describe('DrawerViewTransition', () => {
  afterEach(() => cleanup());

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
