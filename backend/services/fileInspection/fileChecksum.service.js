import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

/**
 * Calcule l'empreinte SHA-256 d'un fichier depuis un flux de lecture.
 *
 * Le contenu est traité progressivement afin que la mémoire consommée ne
 * dépende pas de la taille totale du fichier. Cette propriété restera
 * importante si la limite d'upload augmente dans une future offre.
 *
 * L'empreinte établit l'identité binaire du contenu à un instant donné.
 * Elle ne prouve ni que le fichier est sain, ni qu'il peut être exécuté :
 * cette responsabilité reste celle de l'analyse antivirus.
 *
 * @param {string} filePath
 * @returns {Promise<string>} Empreinte hexadécimale SHA-256 en minuscules.
 */
const calculateFileSha256 = async (filePath) => {
    if (
        typeof filePath !== "string"
        || filePath.trim() === ""
    ) {
        throw new TypeError(
            "Le chemin du fichier à hacher est obligatoire.",
        );
    }

    const hash = createHash("sha256");
    const fileStream = createReadStream(filePath);

    /*
     * L'itération asynchrone respecte la régulation du flux et propage les
     * erreurs de lecture. Une lecture incomplète ne doit jamais produire une
     * empreinte présentée comme valide.
     */
    for await (const chunk of fileStream) {
        hash.update(chunk);
    }

    /*
     * Le modèle File exige exactement 64 caractères hexadécimaux minuscules.
     * L'encodage est fixé ici pour que tous les fournisseurs de stockage
     * produisent la même représentation.
     */
    return hash.digest("hex");
};

export { calculateFileSha256 };