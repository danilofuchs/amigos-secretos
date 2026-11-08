'use client';
import { useI18n } from '@/components/I18nContext';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiddenName } from '@/components/HiddenName';
import { useDemoName } from '@/lib/demo-name';
import { Icon } from '@/components/Icon';
export default function Home() {
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const router = useRouter();
  const demoName = useDemoName();
  return (
    <main id="main" className="home">
      <section className="home-table">
        <div className="home-letter paper-shadow">
          <div className="letter-sheet torn-paper">
            <h1>
              {t('home.ready', 'Ready for a')} <br />
              <span className="ink-underline">{t('home.secretSanta', 'Secret Santa?')}</span>
            </h1>
            <p className="letter-message">
              {t(
                'home.writeDownNamesAgree',
                'Write down the names and agree on the gifts. Everyone gets a folded slip to open.',
              )}{' '}
            </p>
            <p className="letter-message">
              {t(
                'home.sendLinksWhatsappThen',
                'Send the links on WhatsApp. Then hope everyone can keep a secret.',
              )}{' '}
            </p>
            <Link href="/create" className="button">
              {t('home.drawNames', 'Draw names')} <Icon name="arrow" />
            </Link>
            <p className="letter-postscript">
              {t('home.pSShouldSome', 'P.S. Should some people not draw each other?')} <br />
              {t('home.canSetThatUp', 'You can set that up too.')}{' '}
            </p>
          </div>
        </div>
        <div className="home-ritual">
          <HiddenName name={demoName} demo />
        </div>
      </section>
      <section id="bilhete" className="ticket-entry">
        <div>
          <h2>{t('home.gotSecretSlip', 'Got a secret slip?')}</h2>
          <p>{t('home.pasteCodeFromMessage', 'Paste the code from your message.')}</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/${encodeURIComponent(code.trim())}`);
          }}
        >
          <label htmlFor="code">{t('home.slipCode', 'Slip code')}</label>
          <div className="inline-form">
            <input
              id="code"
              value={code}
              // A pasted link keeps only its code, the last 12 letters and digits.
              onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(-12))}
              placeholder={t('home.pasteCodeHere', 'Paste your code here')}
              required
              pattern="[a-zA-Z0-9]{12}"
              minLength={12}
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="button" type="submit">
              {t('home.open', 'Open')} <Icon name="arrow" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
