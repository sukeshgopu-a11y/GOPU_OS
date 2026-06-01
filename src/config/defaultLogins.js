const env = import.meta.env || {};

export const ctoDefaultLoginEmail =
  env.VITE_CTO_DEFAULT_LOGIN_EMAIL || "cto@gopuexports.com";

export const ctoDefaultLoginPassword =
  env.VITE_CTO_DEFAULT_LOGIN_PASSWORD || "";

export const cmoDefaultLoginEmail =
  env.VITE_CMO_DEFAULT_LOGIN_EMAIL || "cmo@gopuexports.com";

export const defaultLoginEmail =
  env.VITE_DEFAULT_LOGIN_EMAIL || "founder@gopuexports.com";

export const defaultLogin = Object.freeze({
  email: defaultLoginEmail,
  ctoEmail: ctoDefaultLoginEmail,
  cmoEmail: cmoDefaultLoginEmail
});
