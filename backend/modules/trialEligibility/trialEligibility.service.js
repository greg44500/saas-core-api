import {
    createHmac,
} from 'node:crypto';

import {
    env,
} from '../../config/env.js';

import {
    TrialEligibility,
} from './trialEligibility.model.js';


/**
 * Produit une identité stable sans conserver l'adresse email source.
 *
 * L'email doit avoir été canonicalisé avant d'arriver dans ce service afin
 * qu'une même identité produise toujours la même empreinte.
 *
 * @param {string} emailCanonical
 * @returns {string}
 */
const createTrialIdentityFingerprint = (
    emailCanonical,
) => {
    if (!emailCanonical) {
        throw new TypeError(
            'emailCanonical is required to create a trial identity fingerprint',
        );
    }

    return createHmac(
        'sha256',
        env.TRIAL_IDENTITY_SECRET,
    )
        .update(emailCanonical)
        .digest('hex');
};


/**
 * Vérifie si une identité commerciale a déjà consommé un trial.
 *
 * @param {object} params
 * @param {string} params.emailCanonical
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<boolean>}
 */
const hasConsumedTrial = async ({
    emailCanonical,
    session = null,
}) => {
    const identityFingerprint =
        createTrialIdentityFingerprint(
            emailCanonical,
        );

    const query =
        TrialEligibility.exists({
            identityFingerprint,
        });

    if (session) {
        query.session(session);
    }

    const existingTrial =
        await query;

    return Boolean(existingTrial);
};


/**
 * Enregistre de manière durable la consommation d'un premier trial.
 *
 * L'index unique constitue la dernière barrière contre deux attributions
 * concurrentes à la même identité.
 *
 * @param {object} params
 * @param {string} params.emailCanonical
 * @param {import('mongoose').Types.ObjectId|string} [params.userId]
 * @param {import('mongoose').Types.ObjectId|string} [params.workspaceId]
 * @param {import('mongoose').Types.ObjectId|string} [params.subscriptionId]
 * @param {import('mongoose').ClientSession|null} [params.session]
 * @returns {Promise<object>}
 */
const recordTrialConsumption = async ({
    emailCanonical,
    userId = null,
    workspaceId = null,
    subscriptionId = null,
    session = null,
}) => {
    const identityFingerprint =
        createTrialIdentityFingerprint(
            emailCanonical,
        );

    const [trialEligibility] =
        await TrialEligibility.create(
            [
                {
                    identityFingerprint,
                    firstUser: userId,
                    firstWorkspace: workspaceId,
                    firstSubscription:
                        subscriptionId,
                    consumedAt: new Date(),
                },
            ],
            {
                session,
            },
        );

    return trialEligibility;
};


export {
    createTrialIdentityFingerprint,
    hasConsumedTrial,
    recordTrialConsumption,
};