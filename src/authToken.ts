// Shared session-token helpers for the Face ID / PIN login.
export const getToken = (): string => localStorage.getItem('authToken') || '';
export const setToken = (t: string): void => localStorage.setItem('authToken', t);
export const clearToken = (): void => localStorage.removeItem('authToken');
export const authHeader = (): Record<string, string> => {
  const t = getToken();
  return t ? { 'X-Auth-Token': t } : {};
};
