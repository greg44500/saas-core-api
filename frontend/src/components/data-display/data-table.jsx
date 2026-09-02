import { DATA_TABLE_STYLES } from '@/components/data-display/data-table-styles';

function resolveClassName(className, row, rowIndex) {
  if (typeof className === 'function') {
    return className(row, rowIndex) ?? '';
  }

  return className ?? '';
}

/**
 * Primitive de tableau partagée.
 *
 * La structure HTML, la densité et les espacements restent centralisés ici.
 * Les features ne fournissent que leurs données et la définition métier des
 * colonnes afin d'éviter de recréer des tableaux légèrement différents.
 *
 * @param {object} props
 * @param {Array<object>} props.columns
 * @param {Array<object>} props.data
 * @param {(row: object, rowIndex: number) => string | number} props.getRowKey
 * @param {string} [props.tableClassName]
 * @param {string} [props.headerClassName]
 * @param {string | ((row: object, rowIndex: number) => string)} [props.rowClassName]
 */
function DataTable({
  columns,
  data,
  getRowKey,
  tableClassName = '',
  headerClassName = 'bg-muted/50 text-muted-foreground',
  rowClassName = '',
}) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full text-left text-sm ${tableClassName}`.trim()}>
        <thead className={headerClassName}>
          <tr>
            {columns.map((column) => (
              <th
                className={`${DATA_TABLE_STYLES.headerCell} font-medium ${column.headerClassName ?? ''}`.trim()}
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((row, rowIndex) => (
            <tr
              className={resolveClassName(rowClassName, row, rowIndex)}
              key={getRowKey(row, rowIndex)}
            >
              {columns.map((column) => (
                <td
                  className={`${DATA_TABLE_STYLES.bodyCell} ${resolveClassName(
                    column.cellClassName,
                    row,
                    rowIndex,
                  )}`.trim()}
                  key={column.id}
                >
                  {column.cell(row, rowIndex)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Groupe d'actions homogène pour les cellules de tableau.
 *
 * @param {object} props
 * @param {import('react').ReactNode} props.children
 * @param {string} [props.className]
 */
function DataTableActions({ children, className = '' }) {
  return (
    <div className={`flex ${DATA_TABLE_STYLES.actionGroup} ${className}`.trim()}>
      {children}
    </div>
  );
}

export { DataTable, DataTableActions };
