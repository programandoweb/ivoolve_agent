export interface DatabaseUserRow {
  id: string;
  tenant_id: string | null;
  username: string;
  password_hash: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'disabled';
}
