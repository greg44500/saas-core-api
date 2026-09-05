import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FILE_UPLOAD_CATEGORY_OPTIONS } from '@/features/files/constants/file-upload.constants';

function FileListFilters({
  category,
  onCategoryChange,
  onClear,
  onSearchChange,
  search,
}) {
  const hasFilters = Boolean(category || search.trim());

  return (
    <div className="flex flex-col gap-3 border-b border-border p-5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <label className="sr-only" htmlFor="file-search">
          Rechercher un fichier
        </label>
        <Input
          id="file-search"
          maxLength={120}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Rechercher un fichier…"
          type="search"
          value={search}
        />
      </div>

      <div className="sm:w-56">
        <label className="sr-only" htmlFor="file-category-filter">
          Filtrer par catégorie
        </label>
        <select
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          id="file-category-filter"
          onChange={(event) => onCategoryChange(event.target.value)}
          value={category}
        >
          <option value="">Toutes les catégories</option>
          {FILE_UPLOAD_CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {hasFilters && (
        <Button onClick={onClear} type="button" variant="ghost">
          Effacer les filtres
        </Button>
      )}
    </div>
  );
}

export { FileListFilters };
