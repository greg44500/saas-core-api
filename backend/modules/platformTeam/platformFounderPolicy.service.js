import mongoose from 'mongoose';

import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';
import { AppError } from '../../utils/appError.js';
import { PlatformTeamMember } from './platformTeamMember.model.js';


const FOUNDER_CURRENT_STATUSES = Object.freeze([
    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
]);

/**
 * Vérifie si un User porte actuellement la qualité protégée de Fondateur.
 *
 * `sanitizeFilter` reste actif : le `$in` est explicitement trusted car il est
 * construit exclusivement à partir de constantes serveur.
 */
const isPlatformFounder = async ({
    userId,
    session = null,
}) => {
    let query = PlatformTeamMember.exists({
        user: userId,
        isFounder: true,
        status: mongoose.trusted({
            $in: FOUNDER_CURRENT_STATUSES,
        }),
    });

    if (session) {
        query = query.session(session);
    }

    return Boolean(await query);
};

const assertUserIsNotPlatformFounder = async ({
    userId,
    session = null,
}) => {
    if (await isPlatformFounder({ userId, session })) {
        throw new AppError(
            'Le compte Fondateur est protégé et ne peut pas être modifié par cette opération.',
            403,
        );
    }
};


export {
    assertUserIsNotPlatformFounder,
    isPlatformFounder,
};
