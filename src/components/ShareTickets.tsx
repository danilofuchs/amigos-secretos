'use client';
import { shareMessage, locales, localeNames, ticketPath, type Locale } from '@/lib/i18n';

import { useI18n } from '@/components/I18nContext';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Icon } from './Icon';
import { TicketArrival } from './TicketArrival';
import { sentCookie } from '@/lib/sent-cookie';
/** Before sent marks moved to a cookie, they lived in localStorage under this key. */
const LEGACY_SENT_KEY = 'sent-tickets';
const sentListeners = new Set<() => void>();
const parseSent = (raw: string) =>
  raw.split('.').filter((code) => /^[A-Za-z0-9]{1,32}$/.test(code));
function readSentCookie(raffleId: string) {
  const prefix = `${sentCookie(raffleId)}=`;
  return (
    document.cookie
      .split('; ')
      .find((part) => part.startsWith(prefix))
      ?.slice(prefix.length) ?? ''
  );
}
function writeSentCookie(raffleId: string, codes: string[]) {
  document.cookie = `${sentCookie(raffleId)}=${codes.join('.')}; path=/sorteios; max-age=31536000; samesite=lax`;
  for (const listener of sentListeners) listener();
}
function subscribeSent(listener: () => void) {
  sentListeners.add(listener);
  return () => {
    sentListeners.delete(listener);
  };
}
/**
 * Which links this browser has sent, per ticket code so a redraw keeps them marked. Kept in a
 * cookie so the server renders the same marks the browser will show.
 */
function useSentTickets(raffleId: string, initial: string, codes: string[]) {
  const raw = useSyncExternalStore(
    subscribeSent,
    () => readSentCookie(raffleId),
    () => initial,
  );
  useEffect(() => {
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_SENT_KEY) ?? '[]') as unknown;
      if (!Array.isArray(legacy) || !legacy.length) return;
      const mine = legacy.filter((code) => codes.includes(code as string)) as string[];
      if (!mine.length) return;
      const current = parseSent(readSentCookie(raffleId));
      writeSentCookie(raffleId, [...new Set([...current, ...mine])]);
      const others = legacy.filter((code) => !mine.includes(code as string));
      if (others.length) localStorage.setItem(LEGACY_SENT_KEY, JSON.stringify(others));
      else localStorage.removeItem(LEGACY_SENT_KEY);
    } catch {
      /* nothing to carry over */
    }
    // Carried over once per raffle and ticket list.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [raffleId, codes.join('.')]);
  return parseSent(raw);
}
export function ShareTickets({
  raffleId,
  title,
  tickets,
  opens = {},
  initialSent = '',
}: {
  raffleId: string;
  /** The raffle's sent-marks cookie as the server saw it. */
  initialSent?: string;
  title: string;
  tickets: { name: string; code: string }[];
  opens?: Record<string, string>;
}) {
  const { t, locale } = useI18n();
  const [messageLocale, setMessageLocale] = useState<Locale | null>(null);
  const sendingLocale = messageLocale ?? locale;
  const [copied, setCopied] = useState<{ name: string; code: string } | null>(null);
  const [fallback, setFallback] = useState('');
  const sent = useSentTickets(
    raffleId,
    initialSent,
    tickets.map((ticket) => ticket.code),
  );
  const markSent = (code: string, value: boolean) => {
    const codes = new Set(parseSent(readSentCookie(raffleId)));
    if (value) codes.add(code);
    else codes.delete(code);
    writeSentCookie(
      raffleId,
      [...codes].filter((c) => tickets.some((ticket) => ticket.code === c)),
    );
  };
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pasteReady, setPasteReady] = useState<string | null>(null);
  const pasteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  // An opened ticket was obviously sent, even if not from this browser.
  const sentCount = tickets.filter(
    (ticket) => sent.includes(ticket.code) || opens[ticket.code],
  ).length;
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
      <TicketArrival raffleId={raffleId} />
      <ul className="send-list">
        {tickets.map((ticket) => {
          const opened = opens[ticket.code];
          const isSent = sent.includes(ticket.code);
          return (
            <li key={ticket.code} className={`send-row ${isSent || opened ? 'sent' : ''}`}>
              <span className="folded-ticket" data-ticket={ticket.code} aria-hidden="true" />
              <div className="send-who">
                <div className="share-slip slip-shadow">
                  <strong className="torn-paper">
                    <span>{ticket.name}</span>
                  </strong>
                </div>
                {/* Like a chat app: one green check once sent, two blue checks once opened. */}
                <p className="send-stamps">
                  {opened ? (
                    <span className="ticket-status opened">
                      <Icon name="checks" width="16" height="16" />
                      <OpenedWhen at={opened} />
                    </span>
                  ) : isSent ? (
                    <button
                      type="button"
                      className="ticket-status sent"
                      onClick={() => markSent(ticket.code, false)}
                      aria-label={t('shareTickets.unmarkMessage', 'Unmark message to {name}', {
                        name: ticket.name,
                      })}
                      title={t('shareTickets.unmark', 'Unmark')}
                    >
                      <Icon name="check" width="16" height="16" />
                      {t('shareTickets.sentStatus', 'sent, not opened yet')}
                    </button>
                  ) : (
                    <span className="ticket-status">
                      {t('shareTickets.notSentYet', 'not sent yet')}
                    </span>
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
                    // WhatsApp's desktop app can send only the link from a shared message, so
                    // the whole message also goes to the clipboard, ready to paste.
                    if (window.matchMedia('(pointer: fine)').matches) {
                      void navigator.clipboard
                        .writeText(text(ticket.name, ticket.code))
                        .then(() => {
                          setPasteReady(ticket.code);
                          if (pasteTimer.current) clearTimeout(pasteTimer.current);
                          pasteTimer.current = setTimeout(() => setPasteReady(null), 12000);
                        })
                        .catch(() => {});
                    }
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
              {pasteReady === ticket.code && (
                <output className="paste-hint">
                  <Icon name="copy" width="14" height="14" />
                  {t(
                    'shareTickets.pasteIfOnlyLink',
                    'Message copied too. If WhatsApp sends only the link, paste the message in the chat.',
                  )}
                </output>
              )}
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

const subscribeNever = () => () => {};
let pageLoadedAt: number | undefined;
const loadedAt = () => (pageLoadedAt ??= Date.now());
/** When a ticket was opened, in the organizer's own clock; filled in once the page is in the browser. */
function OpenedWhen({ at }: { at: string }) {
  const { t, locale } = useI18n();
  const now = useSyncExternalStore(subscribeNever, loadedAt, () => null);
  if (now === null) return t('shareTickets.openedStatus', 'opened');
  const opened = new Date(at),
    today = new Date(now);
  const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(opened);
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  if (opened.toDateString() === today.toDateString())
    return t('shareTickets.openedToday', 'opened today at {time}', { time });
  if (opened.toDateString() === yesterday.toDateString())
    return t('shareTickets.openedYesterday', 'opened yesterday at {time}', { time });
  return t('shareTickets.openedOn', 'opened on {date} at {time}', {
    date: new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(opened),
    time,
  });
}
