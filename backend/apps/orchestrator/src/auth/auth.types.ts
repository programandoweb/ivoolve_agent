export type UserRole = 'admin' | 'operator' | 'viewer';

export interface AuthenticatedUser {
  id: string;
  username: string;
  role: UserRole;
  tenantId: string;
}

export interface JwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  tenantId: string;
}
