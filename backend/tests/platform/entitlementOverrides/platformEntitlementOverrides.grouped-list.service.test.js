import mongoose from 'mongoose';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../../constants/entitlementOverride.constants.js';
import {
    EntitlementOverride,
} from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    listPlatformEntitlementOverrides,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.service.js';

const NOW = new Date('2026-09-11T12:00:00.000Z');

const buildCommercialListQuery = (result) => {
    const query = {
        select: vi.fn(() => query),
        populate: vi.fn(() => query),
        sort: vi.fn(() => query),
        skip: vi.fn(() => query),
        limit: vi.fn(() => query),
        lean: vi.fn().mockResolvedValue(result),
    };

    return query;
};

const buildRelatedLimitQuery = (result) => {
    const query = {
        select: vi.fn(() => query),
        sort: vi.fn(() => query),
        lean: vi.fn().mockResolvedValue(result),
    };

    return query;
};

describe('platformEntitlementOverrides grouped commercial list', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('attache les limites enfants à la feature primaire sans créer de ligne supplémentaire', async () => {
        const workspaceId = new mongoose.Types.ObjectId();
        const actorId = new mongoose.Types.ObjectId();
        const groupId = new mongoose.Types.ObjectId();
        const primaryId = new mongoose.Types.ObjectId();
        const limitId = new mongoose.Types.ObjectId();

        const common = {
            workspace: {
                _id: workspaceId,
                name: 'Workspace test',
            },
            groupId,
            groupName: 'Découverte équipe',
            source: 'support',
            startsAt: new Date('2026-09-10T12:00:00.000Z'),
            endsAt: null,
            reason: 'Essai commercial',
            grantedBy: actorId,
            updatedBy: null,
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
            createdAt: new Date('2026-09-10T12:00:00.000Z'),
            updatedAt: new Date('2026-09-10T12:00:00.000Z'),
        };
        const primary = {
            ...common,
            _id: primaryId,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'team_management',
            metricKey: null,
            featureEnabled: true,
            limitValue: null,
        };
        const relatedLimit = {
            ...common,
            _id: limitId,
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            featureKey: null,
            metricKey: 'members',
            featureEnabled: null,
            limitValue: 6,
        };

        const findSpy = vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValueOnce(buildCommercialListQuery([primary]))
            .mockReturnValueOnce(buildRelatedLimitQuery([relatedLimit]));
        vi.spyOn(EntitlementOverride, 'countDocuments')
            .mockResolvedValue(1);

        const result = await listPlatformEntitlementOverrides({
            page: 1,
            limit: 10,
            at: NOW,
        });

        expect(result.pagination.total).toBe(1);
        expect(result.overrides).toHaveLength(1);
        expect(result.overrides[0]).toMatchObject({
            id: primaryId.toString(),
            groupId: groupId.toString(),
            featureKey: 'team_management',
            relatedOverrides: [
                expect.objectContaining({
                    id: limitId.toString(),
                    metricKey: 'members',
                    limitValue: 6,
                }),
            ],
        });

        const relatedFilter = findSpy.mock.calls[1][0];
        expect(relatedFilter.targetType).toBe(ENTITLEMENT_OVERRIDE_TARGET.LIMIT);
    });
});
