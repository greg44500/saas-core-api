import { z } from 'zod';

import {
    FILE_CATEGORY,
} from '../../constants/file.constants.js';


/**
 * Valide les seules métadonnées textuelles acceptées avec un upload.
 *
 * Le contenu binaire n'appartient pas à ce schéma : Multer le place dans
 * req.file, puis le pipeline d'inspection contrôle son type réel, son
 * empreinte et son innocuité. Mélanger ces responsabilités donnerait à une
 * validation déclarative de req.body une confiance qu'elle ne peut pas avoir.
 *
 * strictObject() interdit notamment qu'un client choisisse lui-même un
 * workspace, un utilisateur, un statut, une storageKey ou un verdict
 * antivirus. Ces valeurs proviendront exclusivement du contexte authentifié
 * et des services internes.
 */
const uploadFileBodySchema = z.strictObject({
    category: z
        .enum(Object.values(FILE_CATEGORY))
        .default(FILE_CATEGORY.OTHER),
});

const workspaceFileParamsSchema = z.strictObject({
    workspaceId: z
        .string()
        .regex(/^[a-f\d]{24}$/i, 'workspaceId invalide'),
    fileId: z
        .string()
        .regex(/^[a-f\d]{24}$/i, 'fileId invalide'),
});


export {
    uploadFileBodySchema,
    workspaceFileParamsSchema,
};
