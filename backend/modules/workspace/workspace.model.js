import mongoose from 'mongoose';

import {
    WORKSPACE_STATUS,
    WORKSPACE_STATUS_REASON,
} from '../../constants/workspace.constants.js';


const { Schema, model } = mongoose;


/**
 * Représente un espace de travail isolé au sein de la plateforme.
 *
 * Le workspace définit la frontière multi-tenant des futures données métier.
 * Il ne porte directement ni ses propriétaires, ni leurs rôles, ni son
 * abonnement : ces responsabilités appartiennent respectivement à
 * WorkspaceMember, Role et Subscription.
 */
const workspaceSchema = new Schema(
    {
        /**
         * Nom affiché du workspace.
         *
         * Il n'est pas unique : deux clients différents peuvent légitimement
         * utiliser le même nom d'entreprise ou d'activité.
         */
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120,
        },

        /**
         * État administratif global du workspace.
         *
         * Cet état prime sur les rôles et permissions de ses membres.
         * Les transitions et les autorisations seront contrôlées par le service.
         */
        status: {
            type: String,
            enum: Object.values(WORKSPACE_STATUS),
            default: WORKSPACE_STATUS.ACTIVE,
            required: true,
        },

        /**
         * Motif structuré associé à l'état administratif actuel.
         *
         * Il reste null lorsque le workspace est actif. Pour un workspace
         * suspendu, archivé ou fermé, le service imposera un motif adapté.
         */
        statusReason: {
            type: String,
            enum: Object.values(WORKSPACE_STATUS_REASON),
            default: null,
        },

        /**
         * Explication complémentaire du changement de statut.
         *
         * Elle ne remplace pas le motif structuré. Elle devient notamment
         * obligatoire lorsque le motif choisi est OTHER.
         *
         * Ce champ ne doit contenir aucune donnée sensible.
         */
        statusReasonDetails: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },

        /**
         * Date de la dernière modification du statut administratif.
         *
         * L'historique complet des changements appartiendra à AuditLog ;
         * ce champ décrit uniquement l'état actuellement enregistré.
         */
        statusChangedAt: {
            type: Date,
            default: Date.now,
            required: true,
        },

        /**
         * Utilisateur ayant appliqué le dernier changement de statut.
         *
         * Il peut s'agir d'un membre autorisé ou d'un superAdmin de la
         * plateforme, selon la transition effectuée.
         */
        statusChangedBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        /**
         * Utilisateur ayant créé historiquement le workspace.
         *
         * Ce champ ne représente pas son owner actuel et ne change pas lors
         * d'un transfert de responsabilité.
         */
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            immutable: true,
        },

        /**
         * Utilisateur ayant effectué la dernière modification du document.
         *
         * Ce champ doit être renseigné explicitement par le service afin de
         * conserver l'identité réelle de l'acteur.
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
 * Accélère les recherches réalisées depuis l'administration de la plateforme,
 * notamment les listes de workspaces suspendus, archivés ou fermés.
 */
workspaceSchema.index({ status: 1, createdAt: -1 });

/**
 * Facilite la recherche des workspaces créés historiquement par un utilisateur.
 *
 * Cet index ne sert pas à déterminer les workspaces auxquels l'utilisateur
 * peut accéder : cette recherche passera par WorkspaceMember.
 */
workspaceSchema.index({ createdBy: 1 });


const Workspace = model('Workspace', workspaceSchema);


export { Workspace };