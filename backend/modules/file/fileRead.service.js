import { FILE_STATUS } from '../../constants/file.constants.js';
import { AppError } from '../../utils/appError.js';
import { storageService } from '../../services/storage/storage.service.js';
import { File } from './file.model.js';

const serializeFile = (file) => ({
    id: file._id.toString(),
    originalName: file.originalName,
    mimeType: file.mimeType,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    category: file.category,
    status: file.status,
    uploadedBy: file.uploadedBy.toString(),
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const listWorkspaceFiles = async ({
    workspaceId,
    page = 1,
    limit = 20,
    category,
    search,
}) => {
    const filter = {
        workspace: workspaceId,
        status: FILE_STATUS.ACTIVE,
        ...(category ? { category } : {}),
        ...(search
            ? {
                originalName: {
                    $regex: escapeRegex(search),
                    $options: 'i',
                },
            }
            : {}),
    };

    const [files, total] = await Promise.all([
        File.find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        File.countDocuments(filter),
    ]);

    return {
        files: files.map(serializeFile),
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

const getWorkspaceFile = async ({ workspaceId, fileId }) => {
    const file = await File.findOne({
        _id: fileId,
        workspace: workspaceId,
        status: FILE_STATUS.ACTIVE,
    }).lean();

    if (!file) {
        throw new AppError('Fichier introuvable', 404);
    }

    return serializeFile(file);
};

const openWorkspaceFileDownload = async ({ workspaceId, fileId }) => {
    /*
     * La frontière multi-tenant et le statut exploitable sont contrôlés dans
     * la même requête que l'identité du fichier. Un identifiant valide d'un
     * autre workspace ne peut donc jamais être utilisé comme raccourci d'accès.
     */
    const file = await File.findOne({
        _id: fileId,
        workspace: workspaceId,
        status: FILE_STATUS.ACTIVE,
    }).lean();

    if (!file) {
        throw new AppError('Fichier introuvable', 404);
    }

    const stream = await storageService.createFileReadStream({
        provider: file.storageProvider,
        storageKey: file.storageKey,
    });

    return {
        file: serializeFile(file),
        stream,
    };
};

export {
    getWorkspaceFile,
    listWorkspaceFiles,
    openWorkspaceFileDownload,
};
