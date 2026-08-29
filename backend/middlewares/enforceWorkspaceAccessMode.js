import {
    WORKSPACE_ACCESS_MODE,
} from '../constants/workspaceAccess.constants.js';
import {
    getWorkspaceAccessEntitlement,
} from '../modules/subscriptions/subscription.service.js';
import { AppError } from '../utils/appError.js';

/**
 * Construit le middleware de contrôle du mode d'accès d'un workspace.
 *
 * La résolution métier est injectée pour garder cette couche HTTP facilement
 * testable et pour éviter de dupliquer la logique d'entitlement.
 */
const createEnforceWorkspaceAccessMode = ({
    resolveWorkspaceAccessEntitlement,
}) => {
    if (typeof resolveWorkspaceAccessEntitlement !== 'function') {
        throw new TypeError(
            'Le résolveur du mode d’accès workspace est invalide.',
        );
    }

    /**
     * Par défaut, une route protégée est une action métier normale et doit être
     * refusée en remédiation. Les routes de correction devront déclarer
     * explicitement `allowDuringRemediation: true`.
     */
    return ({ allowDuringRemediation = false } = {}) => {
        if (typeof allowDuringRemediation !== 'boolean') {
            throw new TypeError(
                'allowDuringRemediation doit être un booléen.',
            );
        }

        return async (req, res, next) => {
            if (!req.workspace?._id) {
                return next(
                    new AppError(
                        'Le contexte du workspace est indisponible.',
                        500,
                    ),
                );
            }

            try {
                const workspaceAccess =
                    await resolveWorkspaceAccessEntitlement({
                        workspaceId: req.workspace._id,
                    });

                req.workspaceAccess = workspaceAccess;

                if (
                    workspaceAccess.accessMode
                    === WORKSPACE_ACCESS_MODE.NORMAL
                ) {
                    return next();
                }

                if (
                    workspaceAccess.accessMode
                    === WORKSPACE_ACCESS_MODE.REMEDIATION
                    && allowDuringRemediation
                ) {
                    return next();
                }

                return next(
                    new AppError(
                        'Le workspace est en mise en conformité. Cette action est temporairement indisponible.',
                        403,
                    ),
                );
            } catch (error) {
                return next(error);
            }
        };
    };
};

const enforceWorkspaceAccessMode =
    createEnforceWorkspaceAccessMode({
        resolveWorkspaceAccessEntitlement:
            getWorkspaceAccessEntitlement,
    });

export {
    createEnforceWorkspaceAccessMode,
    enforceWorkspaceAccessMode,
};
