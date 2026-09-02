import { z } from 'zod';

import { ALLOWED_UPLOAD_MIME_TYPES } from '@/features/files/constants/file-upload.constants';

const fileUploadSchema = z.strictObject({
  category: z.enum([
    'avatar',
    'logo',
    'document',
    'image',
    'import',
    'export',
    'other',
  ]),
  file: z
    .any()
    .refine((file) => file instanceof File, {
      message: 'Sélectionnez un fichier.',
    })
    .refine(
      (file) =>
        !(file instanceof File) || ALLOWED_UPLOAD_MIME_TYPES.includes(file.type),
      {
        message: 'Seuls les fichiers PDF, JPG et PNG sont acceptés.',
      },
    ),
});

function validateFileUpload(values) {
  return fileUploadSchema.safeParse(values);
}

export { fileUploadSchema, validateFileUpload };
