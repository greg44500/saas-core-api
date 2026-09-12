import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

describe('Select', () => {
  it('affiche le libellé de l’item sélectionné plutôt que sa valeur technique', () => {
    render(
      <Select value="standard">
        <SelectTrigger aria-label="Offre cible">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="standard">Standard</SelectItem>
          <SelectItem value="premium">Premium</SelectItem>
        </SelectContent>
      </Select>,
    );

    expect(screen.getByLabelText('Offre cible')).toHaveTextContent('Standard');
    expect(screen.getByLabelText('Offre cible')).not.toHaveTextContent('standard');
  });
});
