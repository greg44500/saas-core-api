import { AuditLog } from './auditLog.model.js';


/**
 * Persiste un événement d’audit immuable.
 *
 * Le service propage volontairement toute erreur de validation ou de
 * persistance. L’appelant doit décider explicitement si l’audit participe à
 * sa transaction ou si son échec peut être traité comme non bloquant.
 *
 * @param {object} auditData
 * @param {mongoose.Types.ObjectId|null} [auditData.actor]
 * @param {mongoose.Types.ObjectId|null} [auditData.workspace]
 * @param {mongoose.Types.ObjectId|null} [auditData.organization]
 * @param {string} auditData.action
 * @param {string|null} [auditData.entityType]
 * @param {mongoose.Types.ObjectId|null} [auditData.entityId]
 * @param {string} auditData.status
 * @param {string|null} [auditData.ipAddress]
 * @param {string|null} [auditData.userAgent]
 * @param {object} [auditData.metadata]
 * @param {object} [options]
 * @param {mongoose.ClientSession|null} [options.session]
 * @returns {Promise<AuditLog>}
 */
async function createAuditLog(
    {
        actor = null,
        workspace = null,
        organization = null,
        action,
        entityType = null,
        entityId = null,
        status,
        ipAddress = null,
        userAgent = null,
        metadata = {},
    },
    {
        session = null,
    } = {},
) {
    /*
     * La sélection explicite des champs empêche un appelant d’imposer des
     * propriétés contrôlées par le système, notamment _id ou createdAt.
     */
    const auditLog = new AuditLog({
        actor,
        workspace,
        organization,
        action,
        entityType,
        entityId,
        status,
        ipAddress,
        userAgent,
        metadata,
    });

    /*
     * Une session fournie rattache l’audit à la transaction métier en cours :
     * l’action sensible et sa trace sont alors validées ou annulées ensemble.
     */
    const saveOptions = session
        ? { session }
        : {};

    return auditLog.save(saveOptions);
}


export {
    createAuditLog,
};