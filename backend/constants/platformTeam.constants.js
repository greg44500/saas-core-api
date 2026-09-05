const PLATFORM_TEAM_ROLE_KEY = Object.freeze({
    SUPER_ADMIN: 'super_admin',
    PLATFORM_ADMIN: 'platform_admin',
    TECHNICAL_SUPPORT: 'technical_support',
    COMMERCIAL_SUPPORT: 'commercial_support',
    CUSTOMER_SUPPORT: 'customer_support',
});

const PLATFORM_ROLE_STATUS = Object.freeze({
    ACTIVE: 'active',
    ARCHIVED: 'archived',
});

const PLATFORM_TEAM_MEMBER_STATUS = Object.freeze({
    ACTIVE: 'active',
    SUSPENDED: 'suspended',
    REVOKED: 'revoked',
});

const PLATFORM_INVITATION_STATUS = Object.freeze({
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    EXPIRED: 'expired',
    REVOKED: 'revoked',
});

const PLATFORM_INVITATION_DELIVERY_STATUS = Object.freeze({
    PENDING: 'pending',
    SENT: 'sent',
    FAILED: 'failed',
});

const PLATFORM_INVITATION_TOKEN_BYTES = 32;
const PLATFORM_INVITATION_TTL_DAYS = 7;

export {
    PLATFORM_INVITATION_DELIVERY_STATUS,
    PLATFORM_INVITATION_STATUS,
    PLATFORM_INVITATION_TOKEN_BYTES,
    PLATFORM_INVITATION_TTL_DAYS,
    PLATFORM_ROLE_STATUS,
    PLATFORM_TEAM_MEMBER_STATUS,
    PLATFORM_TEAM_ROLE_KEY,
};
