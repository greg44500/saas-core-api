import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    findOne: vi.fn(),
}));

vi.mock(
    '../../modules/entitlementOverride/entitlementOverride.model.js',
    () => ({
        EntitlementOverride: {
            findOne: mocks.findOne,
        },
    }),
);

import {
    getNextEntitlementChangeAt,
} from '../../modules/entitlementOverride/entitlementOverrideSchedule.service.js';

const createQuery = (result) => {
    const query = {
        select: vi.fn(),
        sort: vi.fn(),
        lean: vi.fn(),
        session: vi.fn(),
    };

    query.select.mockReturnValue(query);
    query.sort.mockReturnValue(query);
    query.lean.mockReturnValue(query);
    query.session.mockResolvedValue(result);
    query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);

    return query;
};

describe('getNextEntitlementChangeAt', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('retourne la plus proche borne entre un démarrage et une fin', async () => {
        mocks.findOne
            .mockReturnValueOnce(createQuery({
                startsAt: new Date('2026-09-04T15:00:00.000Z'),
            }))
            .mockReturnValueOnce(createQuery({
                endsAt: new Date('2026-09-04T14:30:00.000Z'),
            }));

        const result = await getNextEntitlementChangeAt({
            workspaceId: 'workspace-id',
            at: new Date('2026-09-04T14:00:00.000Z'),
        });

        expect(result).toEqual(
            new Date('2026-09-04T14:30:00.000Z'),
        );
        expect(mocks.findOne).toHaveBeenCalledTimes(2);
    });

    it('retourne null sans prochaine échéance', async () => {
        mocks.findOne
            .mockReturnValueOnce(createQuery(null))
            .mockReturnValueOnce(createQuery(null));

        await expect(
            getNextEntitlementChangeAt({
                workspaceId: 'workspace-id',
                at: new Date('2026-09-04T14:00:00.000Z'),
            }),
        ).resolves.toBeNull();
    });

    it('refuse les paramètres invalides', async () => {
        await expect(
            getNextEntitlementChangeAt({}),
        ).rejects.toThrow(
            'workspaceId is required to resolve the next entitlement change',
        );

        await expect(
            getNextEntitlementChangeAt({
                workspaceId: 'workspace-id',
                at: new Date('invalid'),
            }),
        ).rejects.toThrow('at must be a valid Date');
    });
});
