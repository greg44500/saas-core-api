import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DataTable, DataTableActions } from '@/components/data-display/data-table';

describe('DataTable', () => {
  afterEach(() => cleanup());

  it('rend les colonnes et les données fournies par la feature', () => {
    const columns = [
      {
        id: 'name',
        header: 'Nom',
        cell: (row) => row.name,
      },
      {
        id: 'status',
        header: 'Statut',
        cell: (row) => row.status,
      },
    ];

    render(
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'Alpha', status: 'Actif' }]}
        getRowKey={(row) => row.id}
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Nom' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Statut' })).toBeInTheDocument();
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });

  it('propose un mode compact sans scroll horizontal pour les conteneurs étroits', () => {
    const columns = [
      {
        id: 'name',
        header: 'Nom',
        cell: (row) => row.name,
      },
    ];

    render(
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'Alpha' }]}
        density="compact"
        getRowKey={(row) => row.id}
        scrollable={false}
        tableClassName="table-fixed"
      />,
    );

    const table = screen.getByRole('table');
    const wrapper = table.parentElement;

    expect(wrapper).toHaveClass('overflow-x-hidden');
    expect(wrapper).not.toHaveClass('overflow-x-auto');
    expect(table).toHaveClass('table-fixed');
    expect(screen.getByRole('columnheader', { name: 'Nom' })).toHaveClass(
      'px-3',
      'py-2.5',
    );
    expect(screen.getByText('Alpha').closest('td')).toHaveClass(
      'px-3',
      'py-3',
    );
  });

  it('centralise aussi le groupe d’actions des cellules', () => {
    render(
      <DataTableActions className="flex-wrap">
        <button type="button">Voir</button>
        <button type="button">Modifier</button>
      </DataTableActions>,
    );

    const group = screen.getByRole('button', { name: 'Voir' }).parentElement;

    expect(group).toHaveClass('flex', 'gap-2', 'flex-wrap');
  });
});
