import mongoose from 'mongoose';

import {
    AUDIT_ACTION,
    AUDIT_ENTITY_TYPE,
    AUDIT_STATUS,
} from '../../../constants/auditActions.constants.js';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../../constants/subscription.constants.js';

import {
    createAuditLog,
} from '../../auditLog/auditLog.service.js';

import {
    Subscription,
} from '../subscription.model.js';


/**
 * Expire les trials commerciaux dont l'échéance est atteinte.
 *
 * Ce service contient uniquement la règle métier d'expiration naturelle. Il ne
 * décide pas quand ni à quelle fréquence il est exécuté : un futur job pourra
 * simplement l'appeler sans dupliquer la logique de cycle de vie.
 *
 * Invariants protégés :
 * - seules les Subscription `commercial` encore `trialing` sont candidates ;
 * - trialEndsAt doit être une vraie date et être antérieur ou égal à `now` ;
 * - l'expiration naturelle produit `expired`, jamais `canceled` ;
 * - la date d'effet reste trialEndsAt, même si le traitement s'exécute plus tard ;
 * - la baseline Free n'est ni modifiée ni recréée : elle redevient effective
 *   automatiquement via la résolution d'entitlement existante ;
 * - TrialEligibility reste consommé et n'est jamais réinitialisé ;
 * - chaque transition et son audit sont atomiques ;
 * - une transition concurrente est ignorée sans écraser le nouvel état.
 *
 * @param {object} [params]
 * @param {Date} [params.now]
 * @returns {Promise<{
 *     processedAt: Date,
 *     scanned: number,
 *     expired: number,
 *     skipped: number
 * }>}
 */
const expireExpiredTrials = async ({
    now = new Date(),
} = {}) => {
    if (
        !(now instanceof Date)
        || Number.isNaN(now.getTime())
    ) {
        throw new TypeError(
            'now must be a valid Date to expire commercial trials',
        );
    }

    /*
     * $type évite qu'une ancienne donnée incohérente avec trialEndsAt=null soit
     * considérée comme échue par l'ordre de comparaison BSON. L'opérateur est
     * construit exclusivement par le backend et est donc explicitement trusted.
     */
    const candidates = await Subscription.find({
        kind: SUBSCRIPTION_KIND.COMMERCIAL,
        status: SUBSCRIPTION_STATUS.TRIALING,
        trialEndsAt: mongoose.trusted({
            $type: 'date',
            $lte: now,
        }),
    });

    let expired = 0;
    let skipped = 0;

    for (const candidate of candidates) {
        let didExpire = false;

        await mongoose.connection.transaction(async (session) => {
            /*
             * Le statut et l'échéance font partie du filtre d'écriture. Si une
             * autre opération annule, convertit ou expire le trial entre la
             * lecture initiale et cette transaction, nous n'écrasons pas cet état.
             */
            const expiredSubscription =
                await Subscription.findOneAndUpdate(
                    {
                        _id: candidate._id,
                        kind: SUBSCRIPTION_KIND.COMMERCIAL,
                        status: SUBSCRIPTION_STATUS.TRIALING,
                        trialEndsAt: mongoose.trusted({
                            $type: 'date',
                            $lte: now,
                        }),
                    },
                    {
                        $set: {
                            status: SUBSCRIPTION_STATUS.EXPIRED,
                            cancelAtPeriodEnd: false,
                            currentPeriodEnd: candidate.trialEndsAt,
                        },
                    },
                    {
                        returnDocument: 'after',
                        runValidators: true,
                        session,
                    },
                );

            if (!expiredSubscription) {
                return;
            }

            await createAuditLog(
                {
                    actor: null,
                    workspace: candidate.workspace,
                    action: AUDIT_ACTION.SUBSCRIPTION_EXPIRED,
                    entityType: AUDIT_ENTITY_TYPE.SUBSCRIPTION,
                    entityId: expiredSubscription._id,
                    status: AUDIT_STATUS.SUCCESS,
                    metadata: {
                        reason: 'trial_natural_expiration',
                        previousStatus: SUBSCRIPTION_STATUS.TRIALING,
                        newStatus: SUBSCRIPTION_STATUS.EXPIRED,
                        effectiveAt: candidate.trialEndsAt,
                        processedAt: now,
                        baselineFallbackEnabled: true,
                        trialEligibilityPreserved: true,
                    },
                },
                { session },
            );

            didExpire = true;
        });

        if (didExpire) {
            expired += 1;
        } else {
            skipped += 1;
        }
    }

    return {
        processedAt: now,
        scanned: candidates.length,
        expired,
        skipped,
    };
};


export {
    expireExpiredTrials,
};
