const FILE_UPLOAD_CATEGORY_OPTIONS = Object.freeze([
  { value: 'avatar', label: 'Avatar' },
  { value: 'logo', label: 'Logo' },
  { value: 'document', label: 'Document' },
  { value: 'image', label: 'Image' },
  { value: 'import', label: 'Import' },
  { value: 'export', label: 'Export' },
  { value: 'other', label: 'Autre' },
]);

const ALLOWED_UPLOAD_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/png',
]);

const FILE_INPUT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

export {
  ALLOWED_UPLOAD_MIME_TYPES,
  FILE_INPUT_ACCEPT,
  FILE_UPLOAD_CATEGORY_OPTIONS,
};
