import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FILE_UPLOAD_CATEGORY_OPTIONS } from '@/features/files/constants/file-upload.constants';

const ALL_CATEGORIES_VALUE = '__all__';

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
        <Select
          onValueChange={(value) => onCategoryChange(
            value === ALL_CATEGORIES_VALUE ? '' : value,
          )}
          value={category || ALL_CATEGORIES_VALUE}
        >
          <SelectTrigger id="file-category-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES_VALUE}>Toutes les catégories</SelectItem>
            {FILE_UPLOAD_CATEGORY_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
