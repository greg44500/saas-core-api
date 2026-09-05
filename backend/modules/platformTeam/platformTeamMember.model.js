import mongoose from 'mongoose';

import {
    PLATFORM_TEAM_MEMBER_STATUS,
} from '../../constants/platformTeam.constants.js';


const { Schema, model } = mongoose;


/**
 * Appartenance d'un User à l'équipe interne de la Plateforme.
 *
 * Cette ressource est volontairement distincte du User : suspendre ou retirer
 * un collaborateur de l'équipe Platform ne doit pas désactiver son compte ni
 * modifier ses éventuels memberships Workspace.
 */
const platformTeamMemberSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        role: {
            type: Schema.Types.ObjectId,
            ref: 'PlatformRole',
            required: true,
        },
        status: {
            type: String,
            enum: Object.values(PLATFORM_TEAM_MEMBER_STATUS),
            default: PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
            required: true,
        },
        /**
         * La qualité de Fondateur est séparée du rôle RBAC. Elle ne peut donc
         * pas être obtenue par une simple assignation de rôle.
         */
        isFounder: {
            type: Boolean,
            default: false,
            required: true,
        },
        joinedAt: {
            type: Date,
            required: true,
            default: Date.now,
            immutable: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        suspendedAt: {
            type: Date,
            default: null,
        },
        suspendedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        revokedAt: {
            type: Date,
            default: null,
        },
        revokedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    {
        timestamps: true,
    },
);

/**
 * Un User ne peut avoir qu'une appartenance Platform encore exploitable.
 * Les appartenances REVOKED restent conservées pour l'historique et ne
 * bloquent pas une future ré-invitation, qui créera un nouveau document.
 */
platformTeamMemberSchema.index(
    { user: 1 },
    {
        unique: true,
        partialFilterExpression: {
            status: {
                $in: [
                    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
                ],
            },
        },
        name: 'platform_active_team_member_user_unique',
    },
);

/**
 * Une instance ne peut exposer qu'un seul Fondateur actif/suspendu à la fois.
 * Le workflow métier interdira par ailleurs sa suspension ordinaire.
 */
platformTeamMemberSchema.index(
    { isFounder: 1 },
    {
        unique: true,
        partialFilterExpression: {
            isFounder: true,
            status: {
                $in: [
                    PLATFORM_TEAM_MEMBER_STATUS.ACTIVE,
                    PLATFORM_TEAM_MEMBER_STATUS.SUSPENDED,
                ],
            },
        },
        name: 'platform_founder_unique',
    },
);

platformTeamMemberSchema.index({
    status: 1,
    role: 1,
    createdAt: -1,
});


const PlatformTeamMember = model(
    'PlatformTeamMember',
    platformTeamMemberSchema,
);


export { PlatformTeamMember };
