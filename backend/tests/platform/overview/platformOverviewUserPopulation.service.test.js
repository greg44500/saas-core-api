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

const AT = new Date('2026-09-12T12:00:00.000Z');
const FROM = new Date('2026-08-13T12:00:00.000Z');
const TO = new Date('2026-09-12T12:00:00.000Z');
const PREVIOUS_FROM = new Date('2026-07-14T12:00:00.000Z');
const PREVIOUS_TO = FROM;


describe('platformOverviewUserPopulation.service', () => {
    it('retourne uniquement la population cliente avec des répartitions cohérentes', async () => {
        const UserModel = {
            aggregate: vi.fn(async () => [{
                total: [{ count: 8 }],
                byStatus: [
                    { _id: 'active', count: 6 },
                    { _id: 'disabled', count: 1 },
                    { _id: 'deletion_requested', count: 1 },
                ],
                withActiveWorkspaceAccess: [{ count: 7 }],
                suspendedWorkspaceAccessOnly: [{ count: 1 }],
                owners: [{ count: 3 }],
                membersWithoutOwnership: [{ count: 5 }],
                createdInPeriod: [{ count: 4 }],
                createdInPreviousPeriod: [{ count: 2 }],
            }]),
        };
        const service = createPlatformOverviewUserPopulationService({
            UserModel,
        });

        await expect(service({
            from: FROM,
            to: TO,
            at: AT,
        })).resolves.toEqual({
            total: 8,
            createdInPeriod: 4,
            createdInPreviousPeriod: 2,
            changePercent: 100,
            byStatus: {
                active: { count: 6, percentage: 75 },
                disabled: { count: 1, percentage: 12.5 },
                deletionRequested: { count: 1, percentage: 12.5 },
            },
            byAccess: {
                active: { count: 7, percentage: 87.5 },
                suspendedOnly: { count: 1, percentage: 12.5 },
            },
            byRelationship: {
                owner: { count: 3, percentage: 37.5 },
                withoutOwnership: { count: 5, percentage: 62.5 },
            },
        });

        expect(UserModel.aggregate).toHaveBeenCalledWith(
            buildCurrentClientUserPopulationPipeline({
                from: FROM,
                to: TO,
                previousFrom: PREVIOUS_FROM,
                previousTo: PREVIOUS_TO,
            }),
        );
    });

    it('expose toutes les catégories avec zéro lorsqu’aucun utilisateur client n’existe', async () => {
        const UserModel = {
            aggregate: vi.fn(async () => [{}]),
        };
        const service = createPlatformOverviewUserPopulationService({
            UserModel,
        });

        await expect(service({
            from: FROM,
            to: TO,
            at: AT,
        })).resolves.toEqual({
            total: 0,
            createdInPeriod: 0,
            createdInPreviousPeriod: 0,
            changePercent: null,
            byStatus: {
                active: { count: 0, percentage: 0 },
                disabled: { count: 0, percentage: 0 },
                deletionRequested: { count: 0, percentage: 0 },
            },
            byAccess: {
                active: { count: 0, percentage: 0 },
                suspendedOnly: { count: 0, percentage: 0 },
            },
            byRelationship: {
                owner: { count: 0, percentage: 0 },
                withoutOwnership: { count: 0, percentage: 0 },
            },
        });
    });

    it('exclut les comptes clôturés et les membres actuels de la Platform Team', () => {
        const pipeline = buildCurrentClientUserPopulationPipeline({
            from: FROM,
            to: TO,
            previousFrom: PREVIOUS_FROM,
            previousTo: PREVIOUS_TO,
        });

        expect(pipeline[0]).toEqual({
            $match: {
                status: {
                    $in: [
                        'active',
                        'disabled',
                        'deletion_requested',
                    ],
                },
            },
        });

        const platformLookup = pipeline.find(
            (stage) => stage.$lookup?.as === 'currentPlatformMemberships',
        ).$lookup;
        expect(platformLookup.pipeline[0]).toEqual({
            $match: {
                status: {
                    $in: ['active', 'suspended'],
                },
            },
        });
        expect(pipeline).toContainEqual({
            $match: {
                'currentPlatformMemberships.0': {
                    $exists: false,
                },
            },
        });
    });

    it('classe les accès et la propriété sans double compter les utilisateurs', () => {
        const pipeline = buildCurrentClientUserPopulationPipeline({
            from: FROM,
            to: TO,
            previousFrom: PREVIOUS_FROM,
            previousTo: PREVIOUS_TO,
        });
        const setStage = pipeline.find((stage) => stage.$set).$set;
        const facet = pipeline.find((stage) => stage.$facet).$facet;

        expect(setStage.hasActiveWorkspaceAccess).toEqual({
            $in: ['active', '$currentWorkspaceMemberships.status'],
        });
        expect(setStage.hasOwnerWorkspaceRole).toEqual({
            $in: ['owner', '$currentWorkspaceRoles.key'],
        });
        expect(facet.withActiveWorkspaceAccess[0]).toEqual({
            $match: { hasActiveWorkspaceAccess: true },
        });
        expect(facet.suspendedWorkspaceAccessOnly[0]).toEqual({
            $match: { hasActiveWorkspaceAccess: false },
        });
        expect(facet.owners[0]).toEqual({
            $match: { hasOwnerWorkspaceRole: true },
        });
        expect(facet.membersWithoutOwnership[0]).toEqual({
            $match: { hasOwnerWorkspaceRole: false },
        });
    });
});
