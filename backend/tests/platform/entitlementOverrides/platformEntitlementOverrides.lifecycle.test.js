import mongoose from 'mongoose';
import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    ENTITLEMENT_OVERRIDE_LIFECYCLE,
} from '../../../constants/entitlementOverride.constants.js';
import {
    EntitlementOverride,
} from '../../../modules/entitlementOverride/entitlementOverride.model.js';
import {
    buildLifecycleFilter,
    listPlatformEntitlementOverrides,
} from '../../../modules/platform/entitlementOverrides/platformEntitlementOverrides.service.js';


const NOW = new Date('2026-09-04T12:00:00.000Z');

const buildListQuery = (result = []) => {
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


describe('platformEntitlementOverrides lifecycle filtering', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('traduit chaque lifecycle en filtre temporel non persisté', () => {
        expect(buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
            at: NOW,
        })).toEqual({
            revokedAt: null,
            startsAt: { $lte: NOW },
            $or: [
                { endsAt: null },
                { endsAt: { $gt: NOW } },
            ],
        });

        expect(buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED,
            at: NOW,
        })).toEqual({
            revokedAt: null,
            startsAt: { $gt: NOW },
        });

        expect(buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED,
            at: NOW,
        })).toEqual({
            revokedAt: null,
            endsAt: {
                $ne: null,
                $lte: NOW,
            },
        });

        expect(buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED,
            at: NOW,
        })).toEqual({
            revokedAt: { $ne: null },
        });
    });

    it('applique le filtre active avant pagination et comptage', async () => {
        const findSpy = vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValue(buildListQuery());
        const countSpy = vi.spyOn(EntitlementOverride, 'countDocuments')
            .mockResolvedValue(0);

        await listPlatformEntitlementOverrides({
            page: 1,
            limit: 20,
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
            at: NOW,
        });

        const expectedFilter = {
            revokedAt: null,
            startsAt: { $lte: NOW },
            $or: [
                { endsAt: null },
                { endsAt: { $gt: NOW } },
            ],
        };

        expect(findSpy).toHaveBeenCalledWith(expectedFilter);
        expect(countSpy).toHaveBeenCalledWith(expectedFilter);
    });

    it('compose lifecycle et workspace sans dépendre du nom du workspace', async () => {
        const workspaceId = new mongoose.Types.ObjectId().toString();
        const findSpy = vi.spyOn(EntitlementOverride, 'find')
            .mockReturnValue(buildListQuery());
        vi.spyOn(EntitlementOverride, 'countDocuments')
            .mockResolvedValue(0);

        await listPlatformEntitlementOverrides({
            workspaceId,
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
            at: NOW,
        });

        expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({
            workspace: workspaceId,
            revokedAt: null,
            startsAt: { $lte: NOW },
        }));
    });
});
