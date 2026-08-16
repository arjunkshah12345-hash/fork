export interface SupercompressSettings {
  apiKey: string;
  linkedAt: string;
}

export interface UserSettings {
  supercompress?: SupercompressSettings;
}

export interface AuthUser {
  id: string;
  email: string;
  createdAt: string;
  /** True when the account has connected a SuperCompress API key. */
  supercompressLinked?: boolean;
}

export interface PasswordDigest {
  algorithm: "scrypt";
  salt: string;
  hash: string;
  keyLength: number;
}

export interface StoredAuthUser extends AuthUser {
  password: PasswordDigest;
  settings?: UserSettings;
}

export interface SessionPayload {
  v: 1;
  sub: string;
  iat: number;
  exp: number;
}

