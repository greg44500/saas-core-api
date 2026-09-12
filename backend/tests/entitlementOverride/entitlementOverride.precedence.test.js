import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../constants/entitlementOverride.constants.js';
import {
    EntitlementOverride,
} from '../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    resolveActiveEntitlementOverrides,
} from '../../modules/entitlementOverride/entitlementOverride.service.js';


const AT = new Date('2026-09-12T12:00:00.000Z');
const WORKSPACE_ID = new mongoose.Types.ObjectId();
const ACTOR_ID = new mongoose.Types.ObjectId();
const STARTS_AT = new Date('2026-09-10T12:00:00.000Z');

const createFeatureOverride = ({
    id,
    featureEnabled,
    createdAt,
}) => ({
    _id: new mongoose.Types.ObjectId(id),
    targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
    featureKey: 'file_upload',
    metricKey: null,
    featureEnabled,
    limitValue: null,
    source: ENTITLEMENT_OVERRIDE_SOURCE.PROMOTION,
    startsAt: STARTS_AT,
    endsAt: null,
    reason: 'Test de précédence déterministe',
    grantedBy: ACTOR_ID,
    updatedBy: null,
    createdAt,
    updatedAt: createdAt,
});

const mockPermanentOverrides = (overrides) => {
    vi.spyOn(EntitlementOverride, 'find')
        .mockImplementation((filter) => {
            const result = filter.endsAt === null ? overrides : [];
            const query = {
                select: vi.fn(() => query),
                lean: vi.fn(() => query),
                then: (resolve, reject) =>
                    Promise.resolve(result).then(resolve, reject),
            };

            return query;
        });
};

afterEach(() => {
    vi.restoreAllMocks();
});

describe('resolveActiveEntitlementOverrides precedence', () => {
    it('départage deux démarrages identiques par createdAt le plus récent', async () => {
        const olderCreation = createFeatureOverride({
            id: '68c000000000000000000001',
            featureEnabled: false,
            createdAt: new Date('2026-09-10T12:00:00.000Z'),
        });
        const newerCreation = createFeatureOverride({
            id: '68c000000000000000000002',
            featureEnabled: true,
            createdAt: new Date('2026-09-11T12:00:00.000Z'),
        });

        mockPermanentOverrides([olderCreation, newerCreation]);

        const result = await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
        });

        expect(result.features.file_upload).toBe(true);
        expect(result.overrides).toHaveLength(1);
        expect(result.overrides[0].id).toBe(newerCreation._id.toString());
    });

    it('départage startsAt et createdAt identiques par _id décroissant', async () => {
        const lowerId = createFeatureOverride({
            id: '68c000000000000000000001',
            featureEnabled: false,
            createdAt: new Date('2026-09-10T12:00:00.000Z'),
        });
        const higherId = createFeatureOverride({
            id: '68c000000000000000000002',
            featureEnabled: true,
            createdAt: new Date('2026-09-10T12:00:00.000Z'),
        });

        mockPermanentOverrides([lowerId, higherId]);

        const result = await resolveActiveEntitlementOverrides({
            workspaceId: WORKSPACE_ID,
            at: AT,
        });

        expect(result.features.file_upload).toBe(true);
        expect(result.overrides).toHaveLength(1);
        expect(result.overrides[0].id).toBe(higherId._id.toString());
    });
});
