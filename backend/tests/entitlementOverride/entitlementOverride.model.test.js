import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';

import {
    ENTITLEMENT_OVERRIDE_SOURCE,
    ENTITLEMENT_OVERRIDE_TARGET,
} from '../../constants/entitlementOverride.constants.js';
import {
    EntitlementOverride,
} from '../../modules/entitlementOverride/entitlementOverride.model.js';


const createId = () => new mongoose.Types.ObjectId();

const baseFields = () => ({
    workspace: createId(),
    source: ENTITLEMENT_OVERRIDE_SOURCE.PROMOTION,
    startsAt: new Date('2026-09-03T10:00:00.000Z'),
    reason: 'Découverte commerciale encadrée',
    grantedBy: createId(),
});

describe('EntitlementOverride model', () => {
    it('accepte une dérogation de feature cohérente', async () => {
        const override = new EntitlementOverride({
            ...baseFields(),
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'audit_logs',
            featureEnabled: true,
            endsAt: new Date('2026-10-03T10:00:00.000Z'),
        });

        await expect(override.validate()).resolves.toBeUndefined();
    });

    it('accepte null comme limite effective illimitée', async () => {
        const override = new EntitlementOverride({
            ...baseFields(),
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            metricKey: 'storage_bytes',
            limitValue: null,
        });

        await expect(override.validate()).resolves.toBeUndefined();
    });

    it('refuse de mélanger une feature et une limite', async () => {
        const override = new EntitlementOverride({
            ...baseFields(),
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'audit_logs',
            featureEnabled: true,
            metricKey: 'storage_bytes',
            limitValue: 100,
        });

        await expect(override.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                metricKey: expect.anything(),
                limitValue: expect.anything(),
            }),
        });
    });

    it('refuse une période dont la fin ne suit pas le début', async () => {
        const override = new EntitlementOverride({
            ...baseFields(),
            targetType: ENTITLEMENT_OVERRIDE_TARGET.LIMIT,
            metricKey: 'members',
            limitValue: 10,
            endsAt: new Date('2026-09-03T10:00:00.000Z'),
        });

        await expect(override.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                endsAt: expect.anything(),
            }),
        });
    });

    it('impose date, auteur et motif pour une révocation', async () => {
        const override = new EntitlementOverride({
            ...baseFields(),
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'file_upload',
            featureEnabled: false,
            revokedAt: new Date('2026-09-05T10:00:00.000Z'),
        });

        await expect(override.validate()).rejects.toMatchObject({
            errors: expect.objectContaining({
                revokedAt: expect.anything(),
            }),
        });
    });

    it('accepte une révocation complète et traçable', async () => {
        const override = new EntitlementOverride({
            ...baseFields(),
            targetType: ENTITLEMENT_OVERRIDE_TARGET.FEATURE,
            featureKey: 'file_upload',
            featureEnabled: false,
            revokedAt: new Date('2026-09-05T10:00:00.000Z'),
            revokedBy: createId(),
            revokeReason: 'Fin anticipée du geste commercial',
        });

        await expect(override.validate()).resolves.toBeUndefined();
    });
});
