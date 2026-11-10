'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { finishGoogleSignIn, signOut } from '@/app/sorteios/account-actions';
import { useI18n } from '@/components/I18nContext';
import { GOOGLE_CLIENT_ID } from '@/lib/google-client';

/** The slice of Google Identity Services this page uses: https://developers.google.com/identity/gsi/web/reference/js-reference */
type GoogleId = {
  initialize(config: {
    client_id: string;
    nonce: string;
    callback: (response: { credential: string }) => void;
    ux_mode: 'popup';
    context: 'signin';
    use_fedcm_for_button: boolean;
    itp_support: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      theme: 'outline';
      size: 'large';
      text: 'continue_with';
      shape: 'pill';
      locale: string;
    },
  ): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

let pendingNonce: Promise<string> | undefined;
/** One nonce at a time: a second request would replace the cookie the first button relies on. */
function startGoogleSignIn() {
  pendingNonce ??= fetch('/sorteios/google-nonce', { method: 'POST' }).then(async (response) => {
    if (!response.ok) throw new Error('No sign-in nonce');
    return ((await response.json()) as { nonce: string }).nonce;
  });
  pendingNonce.catch(() => {
    pendingNonce = undefined;
  });
  return pendingNonce;
}

let script: Promise<GoogleId> | undefined;
function loadGoogle() {
  script ??= new Promise<GoogleId>((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = 'https://accounts.google.com/gsi/client';
    tag.async = true;
    tag.onload = () =>
      window.google ? resolve(window.google.accounts.id) : reject(new Error('No Google'));
    tag.onerror = () => {
      script = undefined;
      tag.remove();
      reject(new Error('Google sign-in did not load'));
    };
    document.head.append(tag);
  });
  return script;
}

/** Signing in keeps this browser's exchanges in a Google account, to open on any device. */
export function GoogleAccount({ email }: { email: string | null }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const button = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Each attempt needs a fresh nonce; a failed sign-in has already spent the last one.
  const [attempt, setAttempt] = useState(0);
  const signedIn = email !== null;

  useEffect(() => {
    if (signedIn) return;
    let cancelled = false;
    void Promise.all([loadGoogle(), startGoogleSignIn()])
      .then(([google, nonce]) => {
        if (cancelled || !button.current) return;
        google.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce,
          ux_mode: 'popup',
          context: 'signin',
          use_fedcm_for_button: true,
          itp_support: true,
          callback: ({ credential }) => {
            void finishGoogleSignIn(credential).then(({ ok }) => {
              pendingNonce = undefined;
              setFailed(!ok);
              if (ok) router.refresh();
              else setAttempt((n) => n + 1);
            });
          },
        });
        google.renderButton(button.current, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          locale,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [signedIn, locale, router, attempt]);

  if (signedIn)
    return (
      <div className="account">
        <p className="account-hint">
          {t('account.savedTo', 'Saved to {email}', { email })}
          {' · '}
        </p>
        <form action={signOut}>
          <button type="submit" className="text-link">
            {t('account.signOut', 'Sign out')}
          </button>
        </form>
      </div>
    );
  return (
    <div className="account">
      <div ref={button} className="google-button" />
      <p className="account-hint">
        {failed
          ? t('account.signInFailed', "Couldn't sign in. Try again.")
          : t('account.signInToSave', 'Sign in with Google to save your exchanges')}
      </p>
    </div>
  );
}
