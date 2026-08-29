import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    SUBSCRIPTION_KIND,
    SUBSCRIPTION_STATUS,
} from '../../constants/subscription.constants.js';

import { Subscription } from '../../modules/subscriptions/subscription.model.js';

import {
    migrateSubscriptionKind,
} from '../../migrations/addSubscriptionKind.migration.js';


describe('migrateSubscriptionKind', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });


    it('attribue BASELINE aux souscriptions historiques sans kind', async () => {
        const updateManySpy = vi
            .spyOn(
                Subscription.collection,
                'updateMany',
            )
            .mockResolvedValue({
                matchedCount: 3,
                modifiedCount: 3,
            });

        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([]);

        vi.spyOn(
            Subscription.collection,
            'createIndex',
        ).mockResolvedValue('workspace_1_kind_1');

        await migrateSubscriptionKind();

        expect(updateManySpy).toHaveBeenCalledWith(
            {
                kind: {
                    $exists: false,
                },
            },
            {
                $set: {
                    kind: SUBSCRIPTION_KIND.BASELINE,
                },
            },
        );
    });


    it('supprime l’ancien index unique basé uniquement sur workspace', async () => {
        vi.spyOn(
            Subscription.collection,
            'updateMany',
        ).mockResolvedValue({
            matchedCount: 0,
            modifiedCount: 0,
        });

        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: 'workspace_1',
                key: {
                    workspace: 1,
                },
                unique: true,
                partialFilterExpression: {
                    status: {
                        $in: [
                            SUBSCRIPTION_STATUS.TRIALING,
                            SUBSCRIPTION_STATUS.ACTIVE,
                            SUBSCRIPTION_STATUS.PAST_DUE,
                        ],
                    },
                },
            },
        ]);

        const dropIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'dropIndex',
            )
            .mockResolvedValue();

        vi.spyOn(
            Subscription.collection,
            'createIndex',
        ).mockResolvedValue('workspace_1_kind_1');

        await migrateSubscriptionKind();

        expect(dropIndexSpy).toHaveBeenCalledWith(
            'workspace_1',
        );
    });


    it('crée le nouvel index unique workspace + kind', async () => {
        vi.spyOn(
            Subscription.collection,
            'updateMany',
        ).mockResolvedValue({
            matchedCount: 0,
            modifiedCount: 0,
        });

        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([]);

        const createIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'createIndex',
            )
            .mockResolvedValue('workspace_1_kind_1');

        await migrateSubscriptionKind();

        expect(createIndexSpy).toHaveBeenCalledWith(
            {
                workspace: 1,
                kind: 1,
            },
            {
                unique: true,
                partialFilterExpression: {
                    status: {
                        $in: [
                            SUBSCRIPTION_STATUS.TRIALING,
                            SUBSCRIPTION_STATUS.ACTIVE,
                            SUBSCRIPTION_STATUS.PAST_DUE,
                        ],
                    },
                },
            },
        );
    });


    it('ne tente pas de supprimer un index legacy lorsqu’il est absent', async () => {
        vi.spyOn(
            Subscription.collection,
            'updateMany',
        ).mockResolvedValue({
            matchedCount: 0,
            modifiedCount: 0,
        });

        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: '_id_',
                key: {
                    _id: 1,
                },
            },
        ]);

        const dropIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'dropIndex',
            )
            .mockResolvedValue();

        vi.spyOn(
            Subscription.collection,
            'createIndex',
        ).mockResolvedValue('workspace_1_kind_1');

        await migrateSubscriptionKind();

        expect(dropIndexSpy).not.toHaveBeenCalled();
    });


    it('retourne un résumé de la migration', async () => {
        vi.spyOn(
            Subscription.collection,
            'updateMany',
        ).mockResolvedValue({
            matchedCount: 4,
            modifiedCount: 4,
        });

        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: 'workspace_1',
                key: {
                    workspace: 1,
                },
                unique: true,
                partialFilterExpression: {
                    status: {
                        $in: [
                            SUBSCRIPTION_STATUS.ACTIVE,
                        ],
                    },
                },
            },
        ]);

        vi.spyOn(
            Subscription.collection,
            'dropIndex',
        ).mockResolvedValue();

        vi.spyOn(
            Subscription.collection,
            'createIndex',
        ).mockResolvedValue('workspace_1_kind_1');

        const result = await migrateSubscriptionKind();

        expect(result).toEqual({
            matchedSubscriptions: 4,
            modifiedSubscriptions: 4,
            legacyIndexRemoved: true,
            targetIndexCreated: true,
        });
    });


    it('ne recrée pas le nouvel index lorsqu’il existe déjà', async () => {
        vi.spyOn(
            Subscription.collection,
            'updateMany',
        ).mockResolvedValue({
            matchedCount: 0,
            modifiedCount: 0,
        });

        vi.spyOn(
            Subscription.collection,
            'indexes',
        ).mockResolvedValue([
            {
                name: 'workspace_1_kind_1',
                key: {
                    workspace: 1,
                    kind: 1,
                },
                unique: true,
                partialFilterExpression: {
                    status: {
                        $in: [
                            SUBSCRIPTION_STATUS.TRIALING,
                            SUBSCRIPTION_STATUS.ACTIVE,
                            SUBSCRIPTION_STATUS.PAST_DUE,
                        ],
                    },
                },
            },
        ]);

        const createIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'createIndex',
            )
            .mockResolvedValue('workspace_1_kind_1');

        const dropIndexSpy = vi
            .spyOn(
                Subscription.collection,
                'dropIndex',
            )
            .mockResolvedValue();

        await migrateSubscriptionKind();

        expect(dropIndexSpy).not.toHaveBeenCalled();
        expect(createIndexSpy).not.toHaveBeenCalled();
    });
});