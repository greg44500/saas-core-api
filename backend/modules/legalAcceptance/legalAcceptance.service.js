import {
    LEGAL_DOCUMENT_VERSION,
} from '../../constants/legalDocuments.constants.js';
import { LegalAcceptance } from './legalAcceptance.model.js';

/**
 * Crée une preuve append-only de l'acceptation contractuelle réalisée lors de
 * l'inscription. La version des documents provient exclusivement du backend.
 */
const createRegistrationLegalAcceptance = async ({
    userId,
    source,
    ipAddress = null,
    userAgent = null,
    acceptedAt = new Date(),
    session,
}) => {
    const [acceptance] = await LegalAcceptance.create(
        [
            {
                user: userId,
                termsVersion: LEGAL_DOCUMENT_VERSION.TERMS,
                privacyPolicyVersion: LEGAL_DOCUMENT_VERSION.PRIVACY_POLICY,
                acceptedAt,
                source,
                ipAddress,
                userAgent,
            },
        ],
        { session },
    );

    return acceptance;
};

export { createRegistrationLegalAcceptance };
