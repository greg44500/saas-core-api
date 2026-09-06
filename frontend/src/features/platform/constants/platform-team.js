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

export {
  PLATFORM_ROLE_STATUS,
  PLATFORM_TEAM_MEMBER_STATUS,
  PLATFORM_TEAM_ROLE_KEY,
};
