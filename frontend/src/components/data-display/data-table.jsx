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
 * Une feature peut nommer le tableau avec `caption`, `aria-label` ou
 * `aria-labelledby`. Le caption reste visuellement masqué par défaut afin de
 * ne pas imposer un doublon de titre dans les layouts existants.
 *
 * `emptyContent` ne porte aucune règle métier : il fournit seulement une ligne
 * unique couvrant les colonnes pour éviter les tableaux visuellement vides.
 * La feature conserve la responsabilité du message affiché.
 *
 * @param {object} props
 * @param {Array<object>} props.columns
 * @param {Array<object>} props.data
 * @param {(row: object, rowIndex: number) => string | number} props.getRowKey
 * @param {'default' | 'compact'} [props.density]
 * @param {boolean} [props.scrollable]
 * @param {string} [props.caption]
 * @param {string} [props.captionClassName]
 * @param {import('react').ReactNode} [props.emptyContent]
 * @param {string} [props.emptyCellClassName]
 * @param {string} [props.tableClassName]
 * @param {string} [props.headerClassName]
 * @param {string | ((row: object, rowIndex: number) => string)} [props.rowClassName]
 * @param {string} [props.'aria-label']
 * @param {string} [props.'aria-labelledby']
 */
function DataTable({
  columns,
  data,
  getRowKey,
  density = 'default',
  scrollable = true,
  caption,
  captionClassName = 'sr-only',
  emptyContent = null,
  emptyCellClassName = 'text-muted-foreground',
  tableClassName = '',
  headerClassName = 'bg-muted/50 text-muted-foreground',
  rowClassName = '',
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
}) {
  const headerCellClassName = density === 'compact'
    ? DATA_TABLE_STYLES.compactHeaderCell
    : DATA_TABLE_STYLES.headerCell;
  const bodyCellClassName = density === 'compact'
    ? DATA_TABLE_STYLES.compactBodyCell
    : DATA_TABLE_STYLES.bodyCell;
  const hasData = data.length > 0;

  return (
    <div className={scrollable ? 'overflow-x-auto' : 'overflow-x-hidden'}>
      <table
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        className={`w-full text-left text-sm ${tableClassName}`.trim()}
      >
        {caption && <caption className={captionClassName}>{caption}</caption>}
        <thead className={headerClassName}>
          <tr>
            {columns.map((column) => (
              <th
                className={`${headerCellClassName} font-medium ${column.headerClassName ?? ''}`.trim()}
                key={column.id}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {!hasData && emptyContent !== null && (
            <tr>
              <td
                className={`${bodyCellClassName} ${emptyCellClassName}`.trim()}
                colSpan={columns.length}
              >
                {emptyContent}
              </td>
            </tr>
          )}
          {data.map((row, rowIndex) => (
            <tr
              className={resolveClassName(rowClassName, row, rowIndex)}
              key={getRowKey(row, rowIndex)}
            >
              {columns.map((column) => (
                <td
                  className={`${bodyCellClassName} ${resolveClassName(
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
