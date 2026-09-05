import {
    afterEach,
    describe,
    expect,
    it,
    vi,
} from 'vitest';

import {
    PlatformRole,
} from '../../modules/platformRole/platformRole.model.js';
import {
    SYSTEM_PLATFORM_ROLE_PRESETS,
} from '../../modules/platformRole/platformRole.presets.js';
import {
    seedPlatformRoles,
} from '../../seeds/seedPlatformRoles.js';


describe('seedPlatformRoles', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('crée les rôles système absents', async () => {
        vi.spyOn(PlatformRole, 'findOne')
            .mockResolvedValue(null);
        const createSpy = vi
            .spyOn(PlatformRole, 'create')
            .mockImplementation(async (payload) => payload);
        const updateSpy = vi.spyOn(PlatformRole, 'updateOne');

        const result = await seedPlatformRoles();

        expect(createSpy).toHaveBeenCalledTimes(
            SYSTEM_PLATFORM_ROLE_PRESETS.length,
        );
        expect(updateSpy).not.toHaveBeenCalled();
        expect(result.created).toEqual(
            SYSTEM_PLATFORM_ROLE_PRESETS.map(({ name }) => name),
        );
        expect(result.updated).toEqual([]);
    });

    it('synchronise un rôle système existant sans recréer le document', async () => {
        vi.spyOn(PlatformRole, 'findOne')
            .mockImplementation(async ({ key }) => ({
                _id: `id-${key}`,
                key,
                isSystem: true,
            }));
        const createSpy = vi.spyOn(PlatformRole, 'create');
        const updateSpy = vi
            .spyOn(PlatformRole, 'updateOne')
            .mockResolvedValue({ acknowledged: true });

        const result = await seedPlatformRoles();

        expect(createSpy).not.toHaveBeenCalled();
        expect(updateSpy).toHaveBeenCalledTimes(
            SYSTEM_PLATFORM_ROLE_PRESETS.length,
        );
        expect(result.created).toEqual([]);
        expect(result.updated).toEqual(
            SYSTEM_PLATFORM_ROLE_PRESETS.map(({ name }) => name),
        );
    });

    it('refuse de remplacer un rôle personnalisé utilisant une clé système', async () => {
        vi.spyOn(PlatformRole, 'findOne')
            .mockResolvedValue({
                _id: 'custom-role-id',
                isSystem: false,
            });

        await expect(seedPlatformRoles()).rejects.toThrow(
            /clé PlatformRole réservée/,
        );
    });
});
