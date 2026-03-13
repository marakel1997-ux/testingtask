'use client';

export const auth = {
  get: () => localStorage.getItem('gc-token') ?? '',
  set: (token: string) => localStorage.setItem('gc-token', token),
  clear: () => localStorage.removeItem('gc-token')
};
