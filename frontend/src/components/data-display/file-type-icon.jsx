import {
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const FILE_TYPE_PRESENTATION = Object.freeze({
  pdf: {
    Icon: FileText,
    className: 'text-red-500 dark:text-red-400',
  },
  image: {
    Icon: FileImage,
    className: 'text-sky-500 dark:text-sky-400',
  },
  png: {
    Icon: FileImage,
    className: 'text-emerald-500 dark:text-emerald-400',
  },
  spreadsheet: {
    Icon: FileSpreadsheet,
    className: 'text-green-600 dark:text-green-400',
  },
  archive: {
    Icon: FileArchive,
    className: 'text-amber-500 dark:text-amber-400',
  },
  code: {
    Icon: FileCode2,
    className: 'text-violet-500 dark:text-violet-400',
  },
  generic: {
    Icon: File,
    className: 'text-muted-foreground',
  },
});

const normalizeExtensions = (extensions = []) => extensions
  .filter(Boolean)
  .map((extension) => String(extension).toLowerCase());

/**
 * Centralise la représentation visuelle des familles de fichiers.
 *
 * Les couleurs sont catégorielles et non sémantiques : elles servent à repérer
 * rapidement un type de fichier et ne doivent jamais être interprétées comme
 * un niveau d'alerte. Le fallback reste volontairement neutre pour que les
 * applications dérivées puissent accepter de nouveaux MIME types sans devoir
 * modifier immédiatement le composant.
 */
function resolveFileTypePresentation({ mimeType, extensions = [] } = {}) {
  const normalizedMimeType = String(mimeType ?? '').toLowerCase();
  const normalizedExtensions = normalizeExtensions(extensions);

  if (normalizedMimeType === 'application/pdf' || normalizedExtensions.includes('pdf')) {
    return FILE_TYPE_PRESENTATION.pdf;
  }

  if (normalizedMimeType === 'image/png' || normalizedExtensions.includes('png')) {
    return FILE_TYPE_PRESENTATION.png;
  }

  if (normalizedMimeType.startsWith('image/')) {
    return FILE_TYPE_PRESENTATION.image;
  }

  if (
    normalizedMimeType.includes('spreadsheet')
    || normalizedMimeType.includes('excel')
    || normalizedMimeType === 'text/csv'
    || normalizedExtensions.some((extension) => ['csv', 'xls', 'xlsx'].includes(extension))
  ) {
    return FILE_TYPE_PRESENTATION.spreadsheet;
  }

  if (
    normalizedMimeType.includes('zip')
    || normalizedMimeType.includes('compressed')
    || normalizedExtensions.some((extension) => ['zip', 'rar', '7z', 'tar', 'gz'].includes(extension))
  ) {
    return FILE_TYPE_PRESENTATION.archive;
  }

  if (
    normalizedMimeType.includes('json')
    || normalizedMimeType.includes('xml')
    || normalizedMimeType.includes('javascript')
    || normalizedMimeType.startsWith('text/html')
    || normalizedExtensions.some((extension) => ['json', 'xml', 'js', 'jsx', 'html', 'css'].includes(extension))
  ) {
    return FILE_TYPE_PRESENTATION.code;
  }

  return FILE_TYPE_PRESENTATION.generic;
}

function FileTypeIcon({
  mimeType,
  extensions = [],
  className,
}) {
  const presentation = resolveFileTypePresentation({ mimeType, extensions });
  const { Icon } = presentation;

  return (
    <Icon
      aria-hidden="true"
      className={cn('size-4 shrink-0', presentation.className, className)}
    />
  );
}

export {
  FILE_TYPE_PRESENTATION,
  FileTypeIcon,
  resolveFileTypePresentation,
};
