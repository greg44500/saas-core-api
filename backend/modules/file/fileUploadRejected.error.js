import { AppError } from '../../utils/appError.js';


class fileUploadRejectedError extends AppError {
    constructor(
        message,
        statusCode,
        rejectionReason,
    ) {
        super(message, statusCode);

        if (
            typeof rejectionReason !== 'string'
            || rejectionReason.trim() === ''
        ) {
            throw new TypeError(
                'La raison du rejet du fichier est obligatoire.',
            );
        }

        this.name = 'FileUploadRejectedError';
        this.rejectionReason = rejectionReason;
    }
}


export { fileUploadRejectedError };