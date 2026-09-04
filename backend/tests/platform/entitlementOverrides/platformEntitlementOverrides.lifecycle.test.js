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

const expectTrustedOperator = ({ condition, operator, value }) => {
    expect(condition[operator]).toBe(value);
    expect(condition).not.toHaveProperty('$eq');
    expect(Object.keys(condition)).toContain(operator);
};


describe('platformEntitlementOverrides lifecycle filtering', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('traduit chaque lifecycle en filtre temporel non persisté', () => {
        const active = buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
            at: NOW,
        });

        expect(active.revokedAt).toBeNull();
        expectTrustedOperator({
            condition: active.startsAt,
            operator: '$lte',
            value: NOW,
        });
        expect(active.$or[0]).toEqual({ endsAt: null });
        expectTrustedOperator({
            condition: active.$or[1].endsAt,
            operator: '$gt',
            value: NOW,
        });

        const scheduled = buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.SCHEDULED,
            at: NOW,
        });

        expect(scheduled.revokedAt).toBeNull();
        expectTrustedOperator({
            condition: scheduled.startsAt,
            operator: '$gt',
            value: NOW,
        });

        const expired = buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.EXPIRED,
            at: NOW,
        });

        expect(expired.revokedAt).toBeNull();
        expect(expired.endsAt.$ne).toBeNull();
        expect(expired.endsAt.$lte).toBe(NOW);
        expect(expired.endsAt).not.toHaveProperty('$eq');
        expect(Object.keys(expired.endsAt).sort()).toEqual(['$lte', '$ne'].sort());

        const revoked = buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.REVOKED,
            at: NOW,
        });

        expect(revoked.revokedAt.$ne).toBeNull();
        expect(revoked.revokedAt).not.toHaveProperty('$eq');
        expect(Object.keys(revoked.revokedAt)).toEqual(['$ne']);
    });

    it('préserve les opérateurs internes lorsque sanitizeFilter est appliqué', () => {
        const filter = buildLifecycleFilter({
            lifecycle: ENTITLEMENT_OVERRIDE_LIFECYCLE.ACTIVE,
            at: NOW,
        });

        mongoose.sanitizeFilter(filter);

        expectTrustedOperator({
            condition: filter.startsAt,
            operator: '$lte',
            value: NOW,
        });
        expectTrustedOperator({
            condition: filter.$or[1].endsAt,
            operator: '$gt',
            value: NOW,
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

        const [findFilter] = findSpy.mock.calls[0];
        const [countFilter] = countSpy.mock.calls[0];

        expect(findFilter.revokedAt).toBeNull();
        expectTrustedOperator({
            condition: findFilter.startsAt,
            operator: '$lte',
            value: NOW,
        });
        expect(findFilter.$or[0]).toEqual({ endsAt: null });
        expectTrustedOperator({
            condition: findFilter.$or[1].endsAt,
            operator: '$gt',
            value: NOW,
        });
        expect(countFilter).toBe(findFilter);
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

        const [filter] = findSpy.mock.calls[0];

        expect(filter.workspace).toBe(workspaceId);
        expect(filter.revokedAt).toBeNull();
        expectTrustedOperator({
            condition: filter.startsAt,
            operator: '$lte',
            value: NOW,
        });
    });
});
