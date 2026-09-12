import {
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    buildCurrentClientUserPopulationPipeline,
    createPlatformOverviewUserPopulationService,
} from '../../../modules/platform/overview/platformOverviewUserPopulation.service.js';


describe('platformOverviewUserPopulation.service', () => {
    it('compte chaque utilisateur client courant une seule fois', async () => {
        const WorkspaceMemberModel = {
            aggregate: vi.fn(async () => [{ count: 8 }]),
        };
        const service = createPlatformOverviewUserPopulationService({
            WorkspaceMemberModel,
        });

        await expect(service()).resolves.toEqual({
            withCurrentClientAccess: 8,
        });

        expect(WorkspaceMemberModel.aggregate).toHaveBeenCalledWith(
            buildCurrentClientUserPopulationPipeline(),
        );
    });

    it('retourne zéro lorsqu’aucune relation client courante n’existe', async () => {
        const WorkspaceMemberModel = {
            aggregate: vi.fn(async () => []),
        };
        const service = createPlatformOverviewUserPopulationService({
            WorkspaceMemberModel,
        });

        await expect(service()).resolves.toEqual({
            withCurrentClientAccess: 0,
        });
    });

    it('filtre les memberships actifs ou suspendus avant de dédupliquer les users', () => {
        expect(buildCurrentClientUserPopulationPipeline()).toEqual([
            {
                $match: {
                    status: {
                        $in: ['active', 'suspended'],
                    },
                },
            },
            {
                $group: {
                    _id: '$user',
                },
            },
            {
                $count: 'count',
            },
        ]);
    });
});
