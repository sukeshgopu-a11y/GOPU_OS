'use client';

import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { login } from '../lib/api';

export function AuthGate({ children }: { children: (token: string) => ReactNode }) {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('admin@gopuexports.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setToken(window.localStorage.getItem('social_saas_token') || '');
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    try {
      const result = await login(email, password);
      window.localStorage.setItem('social_saas_token', result.accessToken);
      setToken(result.accessToken);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed');
    }
  }

  if (token) {
    return (
      <>
        <div className="mx-auto flex max-w-6xl justify-end px-5 pt-5">
          <button
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-cyan-400 hover:text-cyan-200"
            onClick={() => {
              window.localStorage.removeItem('social_saas_token');
              setToken('');
            }}
          >
            Logout
          </button>
        </div>
        {children(token)}
      </>
    );
  }

  return (
    <section className="mx-auto grid min-h-[70vh] max-w-xl place-items-center px-5">
      <form className="panel w-full rounded-2xl p-7" onSubmit={submit}>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Admin Access</p>
        <h1 className="mt-3 text-2xl font-semibold text-white">Sign in to manage daily content runs</h1>
        <label className="mt-6 block text-sm text-slate-300">
          Email
          <input
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="mt-4 block text-sm text-slate-300">
          Password
          <input
            type="password"
            className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none focus:border-cyan-400"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
        <button className="mt-6 w-full rounded-lg bg-cyan-400 px-4 py-3 font-semibold text-slate-950 hover:bg-cyan-300">
          Login
        </button>
      </form>
    </section>
  );
}
