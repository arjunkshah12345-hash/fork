export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
}

export interface PasswordDigest {
  algorithm: "scrypt";
  salt: string;
  hash: string;
  keyLength: number;
}

export interface StoredAuthUser extends AuthUser {
  password: PasswordDigest;
}

export interface SessionPayload {
  v: 1;
  sub: string;
  iat: number;
  exp: number;
}

