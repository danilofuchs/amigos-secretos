'use client';
import { shareMessage, locales, localeNames, ticketPath, type Locale } from '@/lib/i18n';

import { useI18n } from '@/components/I18nContext';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from './Icon';
import { TicketArrival } from './TicketArrival';
const SENT_KEY = 'sent-tickets';
const sentListeners = new Set<() => void>();
function readSent() {
  try {
    return localStorage.getItem(SENT_KEY) ?? '[]';
  } catch {
    return '[]';
  }
}
function subscribeSent(listener: () => void) {
  sentListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    sentListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}
/** Which links this browser has sent, kept per ticket code so a redraw keeps them marked. */
function useSentTickets(): string[] {
  const raw = useSyncExternalStore(subscribeSent, readSent, () => '[]');
  try {
    const codes: unknown = JSON.parse(raw);
    return Array.isArray(codes) ? codes.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    return [];
  }
}
function markSent(code: string, value: boolean) {
  const codes = new Set<string>(JSON.parse(readSent()) as string[]);
  if (value) codes.add(code);
  else codes.delete(code);
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify([...codes].slice(-500)));
  } catch {
    /* the mark lasts only until reload */
  }
  for (const listener of sentListeners) listener();
}
export function ShareTickets({
  raffleId,
  title,
  tickets,
  opens = {},
}: {
  raffleId?: string;
  title: string;
  tickets: { name: string; code: string }[];
  opens?: Record<string, string>;
}) {
  const { t, locale } = useI18n();
  const [messageLocale, setMessageLocale] = useState<Locale | null>(null);
  const sendingLocale = messageLocale ?? locale;
  const openedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'UTC',
  });
  const [copied, setCopied] = useState<{ name: string; code: string } | null>(null);
  const [fallback, setFallback] = useState('');
  const sent = useSentTickets();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function text(name: string, code: string) {
    return shareMessage(
      sendingLocale,
      name,
      title,
      String(new URL(ticketPath(code, sendingLocale), window.location.origin)),
    );
  }
  async function copy(name: string, code: string) {
    try {
      await navigator.clipboard.writeText(text(name, code));
      if (timer.current) clearTimeout(timer.current);
      setCopied({ name, code });
      setFallback('');
      timer.current = setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
      setFallback(text(name, code));
    }
  }
  const sentCount = tickets.filter((ticket) => sent.includes(ticket.code)).length;
  const openedCount = tickets.filter((ticket) => opens[ticket.code]).length;
  return (
    <section className="share-panel">
      <div className="share-heading">
        <h2>{t('shareTickets.sendSlips', 'Send the slips.')}</h2>
        <p>
          {t(
            'shareTickets.sendEachMessageRight',
            'Send each message to the right person. The link is private.',
          )}
        </p>
        <p className="send-progress">
          {t('shareTickets.sentProgress', '{count} of {total} sent', {
            count: sentCount,
            total: tickets.length,
          })}
          {openedCount > 0 &&
            ` · ${t('shareTickets.openedProgress', '{count} opened', { count: openedCount })}`}
        </p>
      </div>
      <label className="message-language">
        {t('shareTickets.messageLanguage', 'Message language')}{' '}
        <select
          className="paper-select"
          value={sendingLocale}
          onChange={(e) => setMessageLocale(e.target.value as Locale)}
        >
          {locales.map((value) => (
            <option key={value} value={value}>
              {localeNames[value]}
            </option>
          ))}
        </select>
      </label>
      {raffleId && <TicketArrival raffleId={raffleId} />}
      <ul className="send-list">
        {tickets.map((ticket) => {
          const opened = opens[ticket.code];
          const isSent = sent.includes(ticket.code);
          return (
            <li key={ticket.code} className={`send-row ${isSent ? 'sent' : ''}`}>
              <span className="folded-ticket" data-ticket={ticket.code} aria-hidden="true" />
              <div className="send-who">
                <div className="share-slip slip-shadow">
                  <strong className="torn-paper">
                    <span>{ticket.name}</span>
                  </strong>
                </div>
                <p className="send-stamps">
                  <span className={`ticket-opened ${opened ? 'opened' : ''}`}>
                    {opened ? (
                      <>
                        <Icon name="check" width="13" height="13" />
                        {t('shareTickets.openedStamp', 'opened')}{' '}
                        {openedAt.format(new Date(opened)) + ' UTC'}
                      </>
                    ) : (
                      t('shareTickets.hasntOpenedYet', "hasn't opened it yet")
                    )}
                  </span>
                  {isSent && (
                    <button
                      type="button"
                      className="sent-stamp"
                      onClick={() => markSent(ticket.code, false)}
                      aria-label={t('shareTickets.unmarkMessage', 'Unmark message to {name}', {
                        name: ticket.name,
                      })}
                      title={t('shareTickets.unmark', 'Unmark')}
                    >
                      <Icon name="check" width="12" height="12" />
                      {t('shareTickets.sentStamp', 'sent')}{' '}
                    </button>
                  )}
                </p>
              </div>
              <div className="send-actions">
                <button
                  className="button secondary small copy-button"
                  type="button"
                  onClick={() => {
                    markSent(ticket.code, true);
                    void copy(ticket.name, ticket.code);
                  }}
                  aria-label={
                    copied?.code === ticket.code
                      ? t('shareTickets.messageCopied', 'Message for {name} copied', {
                          name: ticket.name,
                        })
                      : t('shareTickets.copyMessageFor', 'Copy message for {name}', {
                          name: ticket.name,
                        })
                  }
                  title={t('shareTickets.copyMessageLabel', 'Copy message')}
                >
                  <Icon name={copied?.code === ticket.code ? 'check' : 'copy'} />
                </button>
                <button
                  className="button small"
                  type="button"
                  onClick={() => {
                    markSent(ticket.code, true);
                    window.open(
                      `https://wa.me/?text=${encodeURIComponent(text(ticket.name, ticket.code))}`,
                      '_blank',
                      'noopener,noreferrer',
                    );
                  }}
                >
                  <Icon name="send" />
                  {t('shareTickets.sendWhatsapp', 'Send on WhatsApp')}{' '}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <output aria-live="polite" className="sr-only">
        {copied
          ? t('shareTickets.messageCopied', 'Message for {name} copied', { name: copied.name })
          : ''}
      </output>
      {fallback && (
        <div className="copy-fallback">
          <p className="hint">
            {t(
              'shareTickets.couldntCopyAutomaticallySelect',
              "Couldn't copy automatically. Select the text below.",
            )}
          </p>
          <textarea
            aria-label={t('shareTickets.messageCopy', 'Message to copy')}
            readOnly
            value={fallback}
            rows={7}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </section>
  );
}
