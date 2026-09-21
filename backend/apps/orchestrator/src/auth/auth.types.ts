export interface AuthenticatedUser {
  username: string;
  role: 'admin';
}

export interface JwtPayload {
  sub: string;
  role: 'admin';
}
