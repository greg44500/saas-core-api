import { storageConfig } from '../../config/storage.config.js';

import {
    localStorageProvider,
} from './localStorage.provider.js';

/**
 * Méthodes que chaque fournisseur doit obligatoirement exposer.
 *
 * Le futur fournisseur S3 devra respecter exactement ce contrat.
 */
const REQUIRED_PROVIDER_METHODS = Object.freeze([
    'initialize',
    'storeFromTemporaryPath',
    'deleteFile',
    'createFileReadStream',
]);

/**
 * Vérifie qu'un fournisseur respecte le contrat du service de stockage.
 */
const validateProvider = (provider) => {
    if (
        !provider
        || typeof provider !== 'object'
        || typeof provider.provider !== 'string'
        || provider.provider.length === 0
    ) {
        throw new TypeError(
            'Le fournisseur de stockage est invalide.',
        );
    }

    for (const methodName of REQUIRED_PROVIDER_METHODS) {
        if (typeof provider[methodName] !== 'function') {
            throw new TypeError(
                `Le fournisseur ${provider.provider} ne fournit pas la méthode ${methodName}.`,
            );
        }
    }
};

/**
 * Crée un service capable de router une opération vers plusieurs fournisseurs.
 *
 * La factory permet d'utiliser de faux fournisseurs dans les tests sans
 * toucher au disque local ou à un futur bucket S3.
 */
const createStorageService = ({
    providers,
    defaultProvider,
}) => {
    if (
        !Array.isArray(providers)
        || providers.length === 0
    ) {
        throw new TypeError(
            'Au moins un fournisseur de stockage est obligatoire.',
        );
    }

    const providerRegistry = new Map();

    for (const provider of providers) {
        validateProvider(provider);

        if (providerRegistry.has(provider.provider)) {
            throw new TypeError(
                `Le fournisseur ${provider.provider} est déclaré plusieurs fois.`,
            );
        }

        providerRegistry.set(
            provider.provider,
            provider,
        );
    }

    if (!providerRegistry.has(defaultProvider)) {
        throw new TypeError(
            `Le fournisseur par défaut ${defaultProvider} n'est pas disponible.`,
        );
    }

    /**
     * Résout un fournisseur sans prévoir de repli silencieux.
     *
     * Un fichier enregistré avec S3 ne devra jamais être recherché localement
     * si le fournisseur S3 est indisponible.
     */
    const resolveProvider = (providerKey) => {
        const provider = providerRegistry.get(providerKey);

        if (!provider) {
            throw new TypeError(
                `Le fournisseur de stockage ${providerKey} n'est pas disponible.`,
            );
        }

        return provider;
    };

    /**
     * Initialise tous les fournisseurs enregistrés.
     *
     * Lorsque S3 sera ajouté, le service pourra continuer à lire d'anciens
     * fichiers locaux tout en enregistrant les nouveaux fichiers sur S3.
     */
    const initialize = async () => {
        await Promise.all(
            [...providerRegistry.values()]
                .map((provider) => provider.initialize()),
        );
    };

    /**
     * Stocke un fichier avec le fournisseur demandé ou, pour un nouvel upload,
     * avec le fournisseur configuré par défaut.
     */
    const storeFile = async ({
        provider = defaultProvider,
        sourcePath,
        storageKey,
    }) => {
        const resolvedProvider =
            resolveProvider(provider);

        const result =
            await resolvedProvider.storeFromTemporaryPath({
                sourcePath,
                storageKey,
            });

        return {
            storageProvider: provider,
            storageKey: result.storageKey,
        };
    };

    /**
     * Supprime le contenu chez son fournisseur réel.
     */
    const deleteFile = async ({
        provider,
        storageKey,
    }) => {
        const resolvedProvider =
            resolveProvider(provider);

        return resolvedProvider.deleteFile({
            storageKey,
        });
    };

    /**
     * Ouvre un flux de lecture depuis le fournisseur ayant stocké le fichier.
     */
    const createFileReadStream = async ({
        provider,
        storageKey,
    }) => {
        const resolvedProvider =
            resolveProvider(provider);

        return resolvedProvider.createFileReadStream({
            storageKey,
        });
    };

    return Object.freeze({
        defaultProvider,
        initialize,
        storeFile,
        deleteFile,
        createFileReadStream,
    });
};

const storageService = createStorageService({
    providers: [
        localStorageProvider,
    ],
    defaultProvider: storageConfig.provider,
});

export {
    createStorageService,
    storageService,
};