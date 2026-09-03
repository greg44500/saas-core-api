import mongoose from 'mongoose';
import {
    describe,
    expect,
    it,
} from 'vitest';

import {
    resolveEntitlementOverrideLifecycle,
    serializePlatformEntitlementOverride,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverride.dto.js';


const AT = new Date('2026-09-03T12:00:00.000Z');

const createOverride = (overrides = {}) => ({
    _id: new mongoose.Types.ObjectId(),
    workspace: {
        _id: new mongoose.Types.ObjectId(),
        name: 'Workspace test',
    },
    targetType: 'feature',
    featureKey: 'file_upload',
    metricKey: null,
    featureEnabled: true,
    limitValue: null,
    source: 'support',
    startsAt: new Date('2026-09-01T12:00:00.000Z'),
    endsAt: null,
    reason: 'Accès temporaire',
    grantedBy: null,
    updatedBy: null,
    revokedAt: null,
    revokedBy: null,
    revokeReason: null,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
});


describe('platformEntitlementOverride.dto', () => {
    it('dérive scheduled, active, expired et revoked sans état persisté', () => {
        expect(resolveEntitlementOverrideLifecycle({
            override: createOverride({
                startsAt: new Date('2026-09-04T12:00:00.000Z'),
            }),
            at: AT,
        })).toBe('scheduled');

        expect(resolveEntitlementOverrideLifecycle({
            override: createOverride(),
            at: AT,
        })).toBe('active');

        expect(resolveEntitlementOverrideLifecycle({
            override: createOverride({
                endsAt: new Date('2026-09-03T12:00:00.000Z'),
            }),
            at: AT,
        })).toBe('expired');

        expect(resolveEntitlementOverrideLifecycle({
            override: createOverride({
                revokedAt: new Date('2026-09-02T12:00:00.000Z'),
            }),
            at: AT,
        })).toBe('revoked');
    });

    it('sérialise explicitement les données Platform utiles', () => {
        const override = createOverride();
        const result = serializePlatformEntitlementOverride({
            override,
            at: AT,
        });

        expect(result).toMatchObject({
            id: override._id.toString(),
            workspace: {
                id: override.workspace._id.toString(),
                name: 'Workspace test',
            },
            featureKey: 'file_upload',
            featureEnabled: true,
            lifecycle: 'active',
            reason: 'Accès temporaire',
        });
    });
});
