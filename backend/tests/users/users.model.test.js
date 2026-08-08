import { describe, expect, it } from 'vitest';

import { PLATFORM_ROLE } from '../../constants/platformRoles.constants.js';
import { USER_STATUS } from '../../constants/userStatus.constants.js';
import { User } from '../../modules/users/user.model.js';

describe('User model', () => {
    it('crée un utilisateur valide avec les valeurs par défaut attendues', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'Greg.Example@example.com',
            emailCanonical: 'greg.example@example.com',
        });

        await user.validate();

        expect(user.firstName).toBe('Greg');
        expect(user.lastName).toBe('Ballat');
        expect(user.email).toBe('Greg.Example@example.com');
        expect(user.emailCanonical).toBe('greg.example@example.com');

        expect(user.status).toBe(USER_STATUS.ACTIVE);
        expect(user.platformRole).toBe(PLATFORM_ROLE.USER);

        expect(user.emailVerifiedAt).toBeNull();
        expect(user.passwordChangedAt).toBeNull();
        expect(user.lastLoginAt).toBeNull();

        expect(user.disabledAt).toBeNull();
        expect(user.disabledBy).toBeNull();
        expect(user.disabledReason).toBeNull();

        expect(user.deletionRequestedAt).toBeNull();
        expect(user.deletionRequestedBy).toBeNull();

        expect(user.closedAt).toBeNull();
        expect(user.closedBy).toBeNull();
        expect(user.closureReason).toBeNull();
    });

    it('refuse un status inconnu', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: 'unknown',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un platformRole inconnu', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            platformRole: 'root',
        });

        await expect(user.validate()).rejects.toThrow();
    });
    it('refuse un utilisateur disabled sans disabledAt', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: USER_STATUS.DISABLED,
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('accepte un utilisateur disabled avec disabledAt', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: USER_STATUS.DISABLED,
            disabledAt: new Date(),
        });

        await expect(user.validate()).resolves.toBeUndefined();
    });

    it('refuse une demande de suppression sans deletionRequestedAt', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: USER_STATUS.DELETION_REQUESTED,
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('accepte une demande de suppression avec deletionRequestedAt', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: USER_STATUS.DELETION_REQUESTED,
            deletionRequestedAt: new Date(),
        });

        await expect(user.validate()).resolves.toBeUndefined();
    });

    it('refuse un utilisateur closed sans closedAt', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: USER_STATUS.CLOSED,
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('accepte un utilisateur closed avec closedAt', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
            status: USER_STATUS.CLOSED,
            closedAt: new Date(),
        });

        await expect(user.validate()).resolves.toBeUndefined();
    });
    it('refuse un utilisateur sans firstName', async () => {
        const user = new User({
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un utilisateur sans lastName', async () => {
        const user = new User({
            firstName: 'Greg',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un utilisateur sans email', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un utilisateur sans emailCanonical', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un firstName supérieur à 100 caractères', async () => {
        const user = new User({
            firstName: 'a'.repeat(101),
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un lastName supérieur à 100 caractères', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'a'.repeat(101),
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un email supérieur à 254 caractères', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'a'.repeat(255),
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });

    it('refuse un emailCanonical supérieur à 254 caractères', async () => {
        const user = new User({
            firstName: 'Greg',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'a'.repeat(255),
        });

        await expect(user.validate()).rejects.toThrow();
    });
    it('refuse un firstName vide après trim', async () => {
        const user = new User({
            firstName: '   ',
            lastName: 'Ballat',
            email: 'greg@example.com',
            emailCanonical: 'greg@example.com',
        });

        await expect(user.validate()).rejects.toThrow();
    });
});