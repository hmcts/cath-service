const REJECTED_ROLE_PATTERN = /^citizen(-.*)?$|^letter-holder$/;

export function isRejectedRole(roles: string[]): boolean {
  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.some((role) => REJECTED_ROLE_PATTERN.test(role));
}
