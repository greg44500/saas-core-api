import {
    getPlatformRolePermissionCatalogForActor,
} from './platformRoleCatalog.service.js';
import {
    archiveCustomPlatformRole,
    createCustomPlatformRole,
    getPlatformRoleById,
    listPlatformRoles,
    updateCustomPlatformRole,
} from './platformRole.service.js';


const list = async (req, res) => {
    const { roles, pagination } = await listPlatformRoles({
        page: req.validated.query.page,
        limit: req.validated.query.limit,
        status: req.validated.query.status,
    });

    res.status(200).json({
        status: 'success',
        data: { roles },
        meta: pagination,
    });
};

const getById = async (req, res) => {
    const role = await getPlatformRoleById({
        roleId: req.validated.params.roleId,
    });

    res.status(200).json({
        status: 'success',
        data: { role },
    });
};

const listPermissions = async (req, res) => {
    const permissions = await getPlatformRolePermissionCatalogForActor({
        actorId: req.user.id,
    });

    res.status(200).json({
        status: 'success',
        data: { permissions },
    });
};

const create = async (req, res) => {
    const role = await createCustomPlatformRole({
        roleData: req.validated.body,
        actorId: req.user.id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(201).json({
        status: 'success',
        data: { role },
    });
};

const update = async (req, res) => {
    const role = await updateCustomPlatformRole({
        roleId: req.validated.params.roleId,
        roleData: req.validated.body,
        actorId: req.user.id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { role },
    });
};

const archive = async (req, res) => {
    const role = await archiveCustomPlatformRole({
        roleId: req.validated.params.roleId,
        actorId: req.user.id,
        ipAddress: req.context?.ipAddress ?? null,
        userAgent: req.context?.userAgent ?? null,
    });

    res.status(200).json({
        status: 'success',
        data: { role },
    });
};


export {
    archive,
    create,
    getById,
    list,
    listPermissions,
    update,
};
