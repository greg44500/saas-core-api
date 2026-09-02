import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../constants/auditActions.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import { AppError } from '../../utils/appError.js';
import { createAuditLog } from '../auditLog/auditLog.service.js';
import { User } from './user.model.js';

/**
 * Modifie uniquement les données de présentation du compte courant.
 *
 * L'email est volontairement exclu : son changement nécessitera un workflow
 * dédié avec vérification de la nouvelle adresse avant de devenir modifiable.
 */
const updateCurrentUserProfile = async ({
    userId,
    firstName,
    lastName,
    ipAddress = null,
    userAgent = null,
}) => {
    if (!userId) {
        throw new TypeError('userId is required to update the current profile');
    }

    const profileUpdates = {};
    const changedFields = [];

    if (firstName !== undefined) {
        profileUpdates.firstName = firstName;
        changedFields.push('firstName');
    }

    if (lastName !== undefined) {
        profileUpdates.lastName = lastName;
        changedFields.push('lastName');
    }

    if (changedFields.length === 0) {
        throw new TypeError('at least one profile field is required');
    }

    return mongoose.connection.transaction(async (session) => {
        const user = await User.findOneAndUpdate(
            {
                _id: userId,
                status: mongoose.trusted({
                    $nin: [USER_STATUS.DISABLED, USER_STATUS.CLOSED],
                }),
            },
            {
                $set: {
                    ...profileUpdates,
                    updatedBy: userId,
                },
            },
            {
                returnDocument: 'after',
                runValidators: true,
                session,
            },
        );

        if (!user) {
            throw new AppError('Compte indisponible', 403);
        }

        /*
         * Les anciennes et nouvelles valeurs ne sont pas journalisées afin de
         * ne pas dupliquer des données personnelles dans AuditLog. Les noms des
         * champs modifiés suffisent pour la traçabilité opérationnelle.
         */
        await createAuditLog(
            {
                actor: userId,
                action: AUDIT_ACTION.USER_PROFILE_UPDATED,
                entityType: AUDIT_ENTITY_TYPE.USER,
                entityId: user._id,
                status: AUDIT_STATUS.SUCCESS,
                ipAddress,
                userAgent,
                metadata: { changedFields },
            },
            { session },
        );

        return user;
    });
};

export { updateCurrentUserProfile };
