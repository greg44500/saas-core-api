import mongoose from 'mongoose';

import { WORKSPACE_MEMBER_STATUS } from '../../constants/workspaceMember.constants.js';


const { Schema, model } = mongoose;


/**
 * Représente l’appartenance d’un utilisateur à un workspace.
 *
 * Ce document porte le rôle et l’état d’accès de l’utilisateur uniquement
 * dans le workspace concerné. Il ne modifie pas les droits globaux du User.
 */
const workspaceMemberSchema = new Schema(
    {
        /**
         * Workspace auquel appartient le membre.
         *
         * Cette référence est immuable : déplacer un membership vers un autre
         * workspace créerait une incohérence de droits et de traçabilité.
         */
        workspace: {
            type: Schema.Types.ObjectId,
            ref: 'Workspace',
            required: true,
            immutable: true,
        },

        /**
         * Utilisateur rattaché au workspace.
         *
         * Cette référence est également immuable. Un membership ne peut pas
         * être transféré d’un utilisateur à un autre.
         */
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        /**
         * Rôle attribué au membre dans ce workspace.
         *
         * Les permissions seront obtenues depuis le document Role référencé.
         * Le rôle peut évoluer sans recréer le membership.
         */
        role: {
            type: Schema.Types.ObjectId,
            ref: 'Role',
            required: true,
        },

        /**
         * État actuel de l’appartenance.
         *
         * Ce statut contrôle uniquement l’accès au workspace concerné.
         * Les changements d’état seront encadrés par le service.
         */
        status: {
            type: String,
            enum: Object.values(WORKSPACE_MEMBER_STATUS),
            default: WORKSPACE_MEMBER_STATUS.ACTIVE,
            required: true,
        },

        /**
         * Date de la première adhésion effective au workspace.
         *
         * Elle possède une signification métier distincte de createdAt,
         * même si les deux dates seront généralement identiques à la création.
         */
        joinedAt: {
            type: Date,
            default: Date.now,
            required: true,
            immutable: true,
        },

        /**
         * Utilisateur responsable de la création du membership.
         *
         * Il peut s’agir du créateur du workspace ou d’un acteur ayant finalisé
         * une invitation. Ce champ sert uniquement à la traçabilité.
         */
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        /**
         * Utilisateur ayant effectué la dernière modification.
         *
         * Le service devra le mettre à jour lors d’un changement de rôle
         * ou de statut.
         */
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    },
);


/**
 * Garantit qu’un utilisateur ne possède qu’un seul membership par workspace.
 *
 * Un membership retiré reste donc le document de référence. Une éventuelle
 * réintégration devra le réactiver selon les règles définies par le service.
 */
workspaceMemberSchema.index(
    {
        workspace: 1,
        user: 1,
    },
    {
        unique: true,
    },
);

/**
 * Optimise l’affichage et le comptage des membres d’un workspace
 * selon leur statut.
 */
workspaceMemberSchema.index({
    workspace: 1,
    status: 1,
});

/**
 * Optimise la recherche des workspaces accessibles à un utilisateur.
 */
workspaceMemberSchema.index({
    user: 1,
    status: 1,
});

/**
 * Facilite la recherche des membres possédant un rôle donné dans un workspace,
 * notamment pour protéger le dernier owner actif.
 */
workspaceMemberSchema.index({
    workspace: 1,
    role: 1,
    status: 1,
});


const WorkspaceMember = model(
    'WorkspaceMember',
    workspaceMemberSchema,
);


export { WorkspaceMember };