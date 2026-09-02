import { z } from 'zod';

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  FILE_UPLOAD_CATEGORY_OPTIONS,
} from '@/features/files/constants/file-upload.constants';

const FILE_UPLOAD_CATEGORY_VALUES = FILE_UPLOAD_CATEGORY_OPTIONS.map(({ value }) => value);

const fileUploadSchema = z.strictObject({
  category: z.enum(FILE_UPLOAD_CATEGORY_VALUES),
  file: z
    .instanceof(File, { message: 'Sélectionnez un fichier.' })
    .refine(
      (file) => ALLOWED_UPLOAD_MIME_TYPES.includes(file.type),
      'Seuls les fichiers PDF, JPG et PNG sont acceptés.',
    ),
});

function validateFileUpload(values) {
  return fileUploadSchema.safeParse(values);
}

export { fileUploadSchema, validateFileUpload };
