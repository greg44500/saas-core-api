/**
 * Fournisseurs capables de conserver le contenu physique d'un fichier.
 *
 * Le module File manipulera uniquement ces identifiants. La logique propre
 * au disque local ou à S3 restera isolée dans les services de stockage.
 */
export const FILE_STORAGE_PROVIDER = Object.freeze({
    LOCAL: "local",
    S3: "s3",
});

/**
 * Catégories génériques utilisables par différents produits SaaS.
 *
 * Elles décrivent l'usage général du fichier, sans introduire de règle
 * propre à une future application métier ou à une base de connaissances.
 */
export const FILE_CATEGORY = Object.freeze({
    AVATAR: "avatar",
    LOGO: "logo",
    DOCUMENT: "document",
    IMAGE: "image",
    IMPORT: "import",
    EXPORT: "export",
    OTHER: "other",
});

/**
 * Cycle de vie fonctionnel d'un fichier.
 *
 * Un fichier n'est jamais utilisable avant d'être validé et déclaré actif.
 */
export const FILE_STATUS = Object.freeze({
    QUARANTINED: "quarantined",
    ACTIVE: "active",
    REJECTED: "rejected",
    DELETED: "deleted",
    PURGED: "purged",
});

/**
 * Durée de conservation physique après une suppression logique.
 *
 * La valeur est centralisée car elle appartient à la politique produit et ne
 * doit jamais être dupliquée comme nombre magique dans les services ou jobs.
 */
export const FILE_RETENTION_DAYS = 30;

/**
 * Résultat de l'analyse antivirus.
 *
 * ERROR est différent d'INFECTED :
 * - INFECTED signifie qu'une menace a été détectée ;
 * - ERROR signifie que l'analyse n'a pas pu rendre de verdict fiable.
 *
 * Dans les deux cas, le fichier ne doit pas devenir actif.
 */
export const FILE_SCAN_STATUS = Object.freeze({
    PENDING: "pending",
    CLEAN: "clean",
    INFECTED: "infected",
    ERROR: "error",
});

/**
 * Types de fichiers initialement acceptés.
 *
 * Le type déclaré par le navigateur ne suffira pas. Le backend devra
 * identifier le type réel depuis le contenu binaire, puis vérifier qu'il
 * correspond à l'une de ces définitions.
 */
export const ALLOWED_FILE_TYPES = Object.freeze({
    PDF: Object.freeze({
        mimeType: "application/pdf",
        extensions: Object.freeze(["pdf"]),
    }),

    JPEG: Object.freeze({
        mimeType: "image/jpeg",
        extensions: Object.freeze(["jpg", "jpeg"]),
    }),

    PNG: Object.freeze({
        mimeType: "image/png",
        extensions: Object.freeze(["png"]),
    }),
});

/**
 * Liste dérivée des types MIME autorisés.
 *
 * Elle pourra être utilisée par la configuration de l'upload, mais elle
 * ne remplace pas la détection du type réel du fichier.
 */
export const ALLOWED_FILE_MIME_TYPES = Object.freeze(
    Object.values(ALLOWED_FILE_TYPES).map(({ mimeType }) => mimeType),
);
