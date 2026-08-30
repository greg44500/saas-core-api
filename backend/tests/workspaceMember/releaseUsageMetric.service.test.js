import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findOneAndUpdateMock } = vi.hoisted(() => ({
    findOneAndUpdateMock: vi.fn(),
}));

vi.mock('../../modules/usageMetric/usageMetric.model.js', () => ({
    UsageMetric: { findOneAndUpdate: findOneAndUpdateMock },
}));

import {
    releaseCurrentUsageMetric,
} from '../../modules/usageMetric/releaseUsageMetric.service.js';

beforeEach(() => {
    vi.clearAllMocks();
});

describe('releaseCurrentUsageMetric', () => {
    it('décrémente atomiquement une métrique current sans passer sous zéro', async () => {
        findOneAndUpdateMock.mockResolvedValue({ value: 1 });

        await releaseCurrentUsageMetric({
            workspaceId: 'workspace-id',
            metricKey: 'members',
            actorId: 'actor-id',
        });

        expect(findOneAndUpdateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                workspace: 'workspace-id',
                metricKey: 'members',
                periodType: 'current',
                periodStart: null,
                value: { $gte: 1 },
            }),
            expect.objectContaining({
                $inc: { value: -1 },
            }),
            expect.objectContaining({
                returnDocument: 'after',
            }),
        );
    });

    it('échoue fermement si le compteur ne peut pas être libéré', async () => {
        findOneAndUpdateMock.mockResolvedValue(null);

        await expect(releaseCurrentUsageMetric({
            workspaceId: 'workspace-id',
            metricKey: 'members',
        })).rejects.toThrow(
            'Current usage metric cannot be released safely',
        );
    });
});
