import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    FILE_CATEGORY,
} from '../../constants/file.constants.js';

import {
    listWorkspaceFilesQuerySchema,
    uploadFileBodySchema,
} from '../../modules/file/file.validation.js';


describe('File validation', () => {
    it('accepte une catégorie File autorisée', () => {
        const result =
            uploadFileBodySchema.parse({
                category:
                    FILE_CATEGORY.DOCUMENT,
            });

        expect(result).toEqual({
            category: FILE_CATEGORY.DOCUMENT,
        });
    });


    it('applique la catégorie other lorsque le client ne la fournit pas', () => {
        const result =
            uploadFileBodySchema.parse({});

        expect(result).toEqual({
            category: FILE_CATEGORY.OTHER,
        });
    });


    it('refuse une catégorie inconnue ou un champ interne', () => {
        expect(
            uploadFileBodySchema.safeParse({
                category: 'knowledge_base',
            }).success,
        ).toBe(false);

        expect(
            uploadFileBodySchema.safeParse({
                category:
                    FILE_CATEGORY.DOCUMENT,
                status: 'active',
            }).success,
        ).toBe(false);

        expect(
            uploadFileBodySchema.safeParse({
                category:
                    FILE_CATEGORY.DOCUMENT,
                storageKey:
                    'workspaces/forged/file.pdf',
            }).success,
        ).toBe(false);
    });


    it('valide les filtres serveur du listing et normalise la pagination', () => {
        const result = listWorkspaceFilesQuerySchema.parse({
            page: '2',
            limit: '50',
            category: FILE_CATEGORY.DOCUMENT,
            search: '  contrat  ',
        });

        expect(result).toEqual({
            page: 2,
            limit: 50,
            category: FILE_CATEGORY.DOCUMENT,
            search: 'contrat',
        });
    });


    it('refuse une catégorie de filtre inconnue, une recherche vide ou un champ supplémentaire', () => {
        expect(listWorkspaceFilesQuerySchema.safeParse({
            category: 'unknown',
        }).success).toBe(false);

        expect(listWorkspaceFilesQuerySchema.safeParse({
            search: '   ',
        }).success).toBe(false);

        expect(listWorkspaceFilesQuerySchema.safeParse({
            internal: 'forbidden',
        }).success).toBe(false);
    });
});