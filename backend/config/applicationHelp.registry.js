import {
    composeHelpModuleExtensions,
    createHelpRegistry,
} from '../modules/help/help.registry.js';
import {
    CORE_WORKSPACE_REMEDIATION_HELP_ENTRY_IDS,
} from '../modules/help/helpCoreAccess.registry.js';
import {
    CORE_HELP_CATEGORIES,
    CORE_HELP_ENTRIES,
} from '../modules/help/helpCore.registry.js';


/**
 * Point d'extension explicite du centre d'aide pour les SaaS dérivés.
 *
 * Un module métier peut ajouter ses catégories et fiches sans modifier le
 * corpus Core. La limite de cinq catégories par contexte reste contrôlée par
 * createHelpRegistry afin de préserver le contrat UX D-025.
 *
 * Une extension doit aussi déclarer explicitement les fiches Workspace qui
 * restent exécutables en mode remédiation. Sans déclaration, la fiche reste
 * limitée au mode normal par sécurité.
 */
const APPLICATION_HELP_MODULES = Object.freeze([]);

const helpExtensions = composeHelpModuleExtensions(
    APPLICATION_HELP_MODULES,
);

const ACTIVE_HELP_REGISTRY = createHelpRegistry({
    categories: [
        ...CORE_HELP_CATEGORIES,
        ...helpExtensions.categories,
    ],
    entries: [
        ...CORE_HELP_ENTRIES,
        ...helpExtensions.entries,
    ],
    workspaceRemediationEntryIds: [
        ...CORE_WORKSPACE_REMEDIATION_HELP_ENTRY_IDS,
        ...helpExtensions.workspaceRemediationEntryIds,
    ],
});


export {
    ACTIVE_HELP_REGISTRY,
    APPLICATION_HELP_MODULES,
};
