import mongoose from 'mongoose';

import { EntitlementOverride } from './entitlementOverride.model.js';

const isValidDate = (value) =>
    value instanceof Date
    && !Number.isNaN(value.getTime());

/**
 * Retourne la prochaine borne temporelle susceptible de modifier
 * l'entitlement effectif d'un workspace.
 *
 * Une dérogation peut changer l'état effectif à son démarrage ou à sa fin.
 * Le frontend peut donc programmer un unique refetch à cette échéance au lieu
 * de sonder régulièrement le backend. La sécurité reste assurée par le resolver
 * serveur qui recalcule l'entitlement à chaque contrôle protégé.
 */
const getNextEntitlementChangeAt = async ({
    workspaceId,
    at = new Date(),
    session = null,
}) => {
    if (!workspaceId) {
        throw new TypeError(
            'workspaceId is required to resolve the next entitlement change',
        );
    }

    if (!isValidDate(at)) {
        throw new TypeError('at must be a valid Date');
    }

    const buildQuery = (field) => {
        let query = EntitlementOverride.findOne({
            workspace: workspaceId,
            revokedAt: null,
            [field]: mongoose.trusted({
                $gt: at,
            }),
        })
            .select(field)
            .sort({ [field]: 1, _id: 1 })
            .lean();

        if (session) {
            query = query.session(session);
        }

        return query;
    };

    let nextStart;
    let nextEnd;

    if (session) {
        nextStart = await buildQuery('startsAt');
        nextEnd = await buildQuery('endsAt');
    } else {
        [nextStart, nextEnd] = await Promise.all([
            buildQuery('startsAt'),
            buildQuery('endsAt'),
        ]);
    }

    const candidates = [
        nextStart?.startsAt,
        nextEnd?.endsAt,
    ].filter(isValidDate);

    if (candidates.length === 0) {
        return null;
    }

    return new Date(Math.min(
        ...candidates.map((date) => date.getTime()),
    ));
};

export { getNextEntitlementChangeAt };
