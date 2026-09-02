const FILE_CATEGORY_LABEL = Object.freeze({
  avatar: 'Avatar',
  logo: 'Logo',
  document: 'Document',
  image: 'Image',
  import: 'Import',
  export: 'Export',
  other: 'Autre',
});

function formatFileCategory(category) {
  return FILE_CATEGORY_LABEL[category] ?? category ?? 'Non renseignée';
}

function formatFileSize(sizeBytes) {
  const size = Number(sizeBytes);

  if (!Number.isFinite(size) || size < 0) return '—';
  if (size < 1024) return `${size} o`;

  const units = ['Ko', 'Mo', 'Go', 'To'];
  let value = size / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
  }).format(value)} ${units[unitIndex]}`;
}

function formatFileDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatFileType({ extension, mimeType } = {}) {
  if (extension) return extension.toUpperCase();
  return mimeType ?? '—';
}

export {
  FILE_CATEGORY_LABEL,
  formatFileCategory,
  formatFileDate,
  formatFileSize,
  formatFileType,
};
