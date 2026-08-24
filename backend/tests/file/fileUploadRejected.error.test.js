import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    AppError,
} from '../../utils/appError.js';

import {
    fileUploadRejectedError,
} from '../../modules/file/fileUploadRejected.error.js';


describe('fileUploadRejectedError', () => {
    it('hérite de AppError et conserve les informations du rejet', () => {
        const error = new fileUploadRejectedError(
            'Le type réel du fichier n’est pas autorisé.',
            415,
            'FILE_TYPE_NOT_ALLOWED',
        );

        expect(error).toBeInstanceOf(AppError);
        expect(error).toBeInstanceOf(
            fileUploadRejectedError,
        );

        expect(error.message).toBe(
            'Le type réel du fichier n’est pas autorisé.',
        );

        expect(error.statusCode).toBe(415);
        expect(error.status).toBe('fail');

        expect(error.rejectionReason).toBe(
            'FILE_TYPE_NOT_ALLOWED',
        );

        expect(error.name).toBe(
            'fileUploadRejectedError',
        );
    });

    it.each([
        undefined,
        null,
        '',
        '   ',
    ])(
        'refuse une raison de rejet invalide : %s',
        (rejectionReason) => {
            expect(
                () =>
                    new fileUploadRejectedError(
                        'Upload rejeté.',
                        415,
                        rejectionReason,
                    ),
            ).toThrow(TypeError);
        },
    );
});