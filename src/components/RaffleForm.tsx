'use client';
import { playSound, preloadSounds } from '@/lib/sounds';
import {
  budgetIsValid,
  emptyDetails,
  isPastDay,
  withDetailDefaults,
  normalizeBudget,
  type ExchangeDetails,
} from '@/lib/exchange-details';

import { useI18n } from '@/components/I18nContext';

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { MotionConfig, motion } from 'motion/react';
import type { TargetAndTransition, Variants } from 'motion/react';
import { saveRaffle, type ActionState } from '@/app/create/actions';
import { type Exclusion, type Participant, type Raffle } from '@/lib/raffle';
import { CleanCopyField } from './CleanCopyField';
import { useDemoNameList, useSamplePick } from '@/lib/demo-name';
import { NotebookRings } from './NotebookRings';
import { DrawCeremony } from './DrawCeremony';
import { dropBasket } from '@/lib/basket-stage';
import { lockScroll } from '@/lib/scroll-lock';
import { CEREMONY_KEY, NEW_RAFFLE } from './TicketArrival';
import { BudgetSentence } from './BudgetSentence';
import { HighlightBox } from './HighlightBox';
import { SegmentedDate } from './SegmentedDate';
import { TeacherMark } from './TeacherMark';
import { InkSquiggle } from './InkSquiggle';
import { GroupPicker } from './GroupPicker';
import { matchParticipants } from '@/lib/matching';
import { LineSquiggles } from './LineSquiggles';
import { cleanNames } from '@/lib/text-rules';
import { MAX_NAME_LENGTH, PAGE_OF_FIELD, type FormField } from '@/lib/form-fields';
import { Icon } from './Icon';

const PAGES = [
  ['raffleForm.tab.names', 'Names'],
  ['raffleForm.tab.exclusions', 'Exclusions'],
  ['raffleForm.tab.details', 'Details'],
] as const;
const TURN: Variants = {
  open: {
    rotateY: 0,
    visibility: 'visible',
    transition: { duration: 0.55, ease: [0.3, 0.7, 0.2, 1] },
  },
  turned: {
    rotateY: -92,
    transition: { duration: 0.5, ease: [0.5, 0, 0.7, 0.4] },
    transitionEnd: { visibility: 'hidden' },
  },
};
const RIP: Variants = {
  bound: {
    x: 0,
    y: 0,
    rotate: 0,
    rotateY: 0,
    opacity: 1,
    transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] },
  },
  // A tug against the spiral, a snap, then the sheet glides on its own momentum while it falls.
  ripped: {
    x: [0, 18, 9, 200],
    y: [0, -6, -12, 470],
    rotate: [0, 1.4, -0.8, 15],
    rotateY: [0, 4, 9, -34],
    opacity: [1, 1, 1, 0],
    transition: {
      x: {
        duration: 1.6,
        times: [0, 0.2, 0.3, 1],
        ease: ['easeInOut', [0.3, 0, 0.6, 1], [0.05, 0.75, 0.2, 1]],
      },
      y: {
        duration: 1.6,
        times: [0, 0.2, 0.3, 1],
        ease: ['easeInOut', 'easeOut', [0.55, 0, 0.9, 0.55]],
      },
      rotate: {
        duration: 1.6,
        times: [0, 0.2, 0.3, 1],
        ease: ['easeInOut', 'easeOut', [0.1, 0.6, 0.3, 1]],
      },
      rotateY: {
        duration: 1.6,
        times: [0, 0.2, 0.3, 1],
        ease: ['easeInOut', 'easeOut', [0.2, 0.5, 0.4, 1]],
      },
      opacity: { duration: 1.6, times: [0, 0.3, 0.72, 1] },
    },
  },
};
/** Today in the organizer's own calendar, as an ISO day. */
function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
const nameKey = (name: string) => name.normalize('NFKC').toLocaleLowerCase('pt-BR');
const splitNames = (text: string) =>
  text
    .split(/[\n,;]+/)
    .map((name) => name.trim())
    .filter(Boolean);
const LINK_SLOT = '\u0000';
/** Puts a link where a translated sentence marks it, so each language keeps its own word order. */
function withLink(sentence: string, link: ReactNode) {
  const [before = '', after = ''] = sentence.split(LINK_SLOT);
  return (
    <>
      {before}
      {link}
      {after}
    </>
  );
}

type Lineup = { participants: Participant[]; exclusions: Exclusion[] };
const DRAW_INTENTS = ['draw', 'redraw'];

export function RaffleForm({
  raffle,
  canRedraw = false,
  defaultCurrency = 'BRL',
}: {
  raffle?: Raffle;
  canRedraw?: boolean;
  defaultCurrency?: string;
}) {
  const { t, locale } = useI18n();
  const sampleNames = useDemoNameList();
  const samplePick = useSamplePick();
  const [participants, setParticipants] = useState<Participant[]>(raffle?.participants ?? []);
  const [exclusions, setExclusions] = useState<Exclusion[]>(raffle?.exclusions ?? []);
  const hosts = participants.length ? participants.map((p) => p.name) : sampleNames.split('\n');
  const sampleHost = hosts[Math.floor(samplePick * hosts.length)] ?? '';
  const [details, setDetails] = useState<ExchangeDetails>(
    raffle?.details
      ? withDetailDefaults(raffle.details)
      : { ...emptyDetails, currency: defaultCurrency, budgetKind: 'range' },
  );
  const title = details.occasion.trim();
  const [currencyEdited, setCurrencyEdited] = useState(!!raffle?.details?.currency);
  const effectiveDetails = {
    ...details,
    currency: currencyEdited ? details.currency : defaultCurrency,
  };
  const submittedDetails = normalizeBudget(effectiveDetails);
  const [rules, setRules] = useState(raffle?.rules ?? '');
  const [names, setNames] = useState(() =>
    (raffle?.participants ?? []).map((p) => p.name).join('\n'),
  );
  // The reverse of the rule just written, in pencil until the next rule or page turn.
  const [suggested, setSuggested] = useState<string | null>(null);
  const [groupDraft, setGroupDraft] = useState<string[]>([]);
  const [localError, setLocalError] = useState('');
  const [version, setVersion] = useState(raffle?.version ?? 0);
  const [committed, setCommitted] = useState<Lineup>({
    participants: raffle?.participants ?? [],
    exclusions: raffle?.exclusions ?? [],
  });
  const [autosave, setAutosave] = useState<{ saving: boolean; error: string }>({
    saving: false,
    error: '',
  });
  const payload = JSON.stringify({
    title,
    rules,
    details: submittedDetails,
    participants,
    exclusions,
  });
  const drawn = raffle?.status === 'drawn';
  const lineupChanged =
    drawn &&
    canRedraw &&
    JSON.stringify([participants, exclusions]) !==
      JSON.stringify([committed.participants, committed.exclusions]);
  // A drawn raffle autosaves only the combinados; new names and exceptions wait for a redraw.
  const savePayload = drawn
    ? JSON.stringify({
        title,
        rules,
        details: submittedDetails,
        participants: committed.participants,
        exclusions: committed.exclusions,
      })
    : payload;
  const [savedPayload, setSavedPayload] = useState(savePayload);
  const saved = useRef({ payload: savePayload, version: raffle?.version ?? 0, inFlight: false });
  const [page, setPage] = useState(raffle && raffle.status !== 'draft' ? 2 : 0);
  const [state, action, pending] = useActionState(async (previous: ActionState, form: FormData) => {
    const result = await saveRaffle(previous, form);
    const intent = form.get('intent');
    if (result.error && typeof intent === 'string' && DRAW_INTENTS.includes(intent)) {
      dropBasket();
      try {
        sessionStorage.removeItem(CEREMONY_KEY);
      } catch {
        /* nothing to clear */
      }
    }
    if (result.version !== undefined) {
      saved.current.version = result.version;
      setVersion(result.version);
      const input = form.get('input');
      if (intent === 'redraw' && typeof input === 'string') {
        const lineup = JSON.parse(input) as Lineup;
        setCommitted({ participants: lineup.participants, exclusions: lineup.exclusions });
        saved.current.payload = input;
        setSavedPayload(input);
      }
    }
    const input = form.get('input');
    if (result.field) setPage(PAGE_OF_FIELD[result.field]);
    return typeof input === 'string' ? { ...result, input } : result;
  }, {});
  const latestPayload = useRef(savePayload);
  useEffect(() => {
    latestPayload.current = savePayload;
  }, [savePayload]);
  const archived = raffle?.status === 'archived';
  const locked = archived || (drawn && !canRedraw);
  const loose = !!raffle && raffle.status !== 'draft';
  const [ripFrom, setRipFrom] = useState<ActionState | null>(null);
  const ripped = ripFrom !== null && ripFrom === state;
  const [ceremonyFrom, setCeremonyFrom] = useState<ActionState | null>(null);
  const inCeremony = ripped && ceremonyFrom === state;
  // From the tear onwards things move to fixed screen spots; the basket keeps its own lock after.
  useEffect(() => (ripped ? lockScroll() : undefined), [ripped]);
  useEffect(() => preloadSounds('tear', 'fold', 'shuffle', 'pen', 'pencil', 'eraser'), []);
  function submitDraw() {
    try {
      sessionStorage.setItem(CEREMONY_KEY, raffle?.id ?? NEW_RAFFLE);
    } catch {
      /* the share list still appears, without the ceremony */
    }
    drawRef.current?.form?.requestSubmit(drawRef.current);
  }
  const drawRef = useRef<HTMLButtonElement>(null);
  const pageId = useId();
  async function saveNow() {
    if (!raffle || saved.current.inFlight || latestPayload.current === saved.current.payload)
      return;
    const sending = latestPayload.current;
    saved.current.inFlight = true;
    setAutosave({ saving: true, error: '' });
    const form = new FormData();
    form.set('intent', 'save');
    form.set('id', raffle.id);
    form.set('version', String(saved.current.version));
    form.set('input', sending);
    const result = await saveRaffle({}, form);
    saved.current.inFlight = false;
    if (result.error || result.version === undefined) {
      setAutosave({
        saving: false,
        error: result.error ?? t('raffleForm.couldntSave', "Couldn't save."),
      });
      return;
    }
    saved.current = { payload: sending, version: result.version, inFlight: false };
    setVersion(result.version);
    setSavedPayload(sending);
    setAutosave({ saving: false, error: '' });
    if (latestPayload.current !== sending) void saveNow();
  }

  useEffect(() => {
    if (
      !raffle ||
      archived ||
      ripped ||
      participants.length < 2 ||
      savePayload === saved.current.payload
    )
      return;
    const timer = setTimeout(() => void saveNow(), 800);
    return () => clearTimeout(timer);
  });

  function turnTo(next: number) {
    if (next === page) return;
    setSuggested(null);
    setPage(next);
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        document.getElementById(`${pageId}-heading-${next}`)?.focus({ preventScroll: true }),
      ),
    );
  }
  function commitNames(text: string) {
    const known = new Map(participants.map((p) => [nameKey(p.name), p]));
    const seen = new Set<string>();
    const written: Participant[] = [];
    let repeated = false,
      tooLong = false;
    for (const name of splitNames(text)) {
      const key = nameKey(name);
      if (name.length > MAX_NAME_LENGTH) {
        tooLong = true;
        continue;
      }
      if (seen.has(key)) {
        repeated = true;
        continue;
      }
      seen.add(key);
      written.push(known.get(key) ?? { id: crypto.randomUUID(), name });
    }
    const next = written.slice(0, 100);
    if (next.length !== participants.length || next.some((p, i) => p !== participants[i]))
      setParticipants(next);
    const ids = new Set(next.map((p) => p.id));
    setExclusions((es) => es.filter((e) => ids.has(e.from) && ids.has(e.to)));
    setLocalError(
      tooLong
        ? t('validation.nameTooLong', 'Use names of up to {max} characters.', {
            max: MAX_NAME_LENGTH,
          })
        : written.length > 100
          ? t('raffleForm.limit100Participants', 'The limit is 100 participants.')
          : repeated
            ? t('raffleForm.eachNameAppearsOnly', 'Each name appears only once.')
            : '',
    );
  }
  function writeNames(text: string) {
    if (text.split('\n').length !== names.split('\n').length) commitNames(text);
    setNames(text);
  }
  const canDraw = !raffle || raffle.status === 'draft' || (lineupChanged && !locked);
  const drawLabel = drawn
    ? t('raffleForm.drawAgain', 'Draw again')
    : t('raffleForm.drawNames', 'Draw names');
  function undoLineup() {
    setParticipants(committed.participants);
    setExclusions(committed.exclusions);
    setNames(committed.participants.map((p) => p.name).join('\n'));
    setLocalError('');
  }
  function tabKeys(e: KeyboardEvent<HTMLButtonElement>) {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (page + step + PAGES.length) % PAGES.length;
    turnTo(next);
    requestAnimationFrame(() => document.getElementById(`${pageId}-tab-${next}`)?.focus());
  }
  const sheet = { page, pageId, loose, onTurn: turnTo, onTabKey: tabKeys };
  // Once a ticket is opened, the pages show what was actually drawn, never an unsent draft.
  const shown: Lineup = drawn && locked ? committed : { participants, exclusions };
  const shownNames = drawn && locked ? committed.participants.map((p) => p.name).join('\n') : names;
  const [checked, setChecked] = useState(false);
  const nameLines = shownNames.split('\n');
  const lineIssues = new Map<number, 'repeat' | 'long'>();
  const seenNames = new Set<string>();
  nameLines.forEach((line, index) => {
    const name = line.trim();
    if (!name) return;
    if (name.length > MAX_NAME_LENGTH) lineIssues.set(index, 'long');
    else if (seenNames.has(nameKey(name))) lineIssues.set(index, 'repeat');
    seenNames.add(nameKey(name));
  });
  const firstIssue = [...lineIssues][0];
  const lineMessage = !firstIssue
    ? undefined
    : firstIssue[1] === 'long'
      ? t('validation.nameTooLong', 'Use names of up to {max} characters.', {
          max: MAX_NAME_LENGTH,
        })
      : t('validation.repeatedName', '“{name}” is written more than once.', {
          name: nameLines[firstIssue[0]]!.trim(),
        });
  const [dateIncomplete, setDateIncomplete] = useState(false);
  const personName = (id: string) => shown.participants.find((p) => p.id === id)?.name;
  const listOf = (ids: string[]) =>
    new Intl.ListFormat(locale, { type: 'conjunction' }).format(
      ids.map((id) => personName(id) ?? ''),
    );
  const feasibility =
    shown.participants.length >= 2 ? matchParticipants(shown.participants, shown.exclusions) : null;
  const stuck = new Set(feasibility && !feasibility.ok ? feasibility.givers : []);
  const impossibleMessage =
    !feasibility || feasibility.ok
      ? undefined
      : feasibility.recipients.length === 0
        ? t('validation.drawNobodyLeft', '{givers} cannot draw anyone.', {
            givers: listOf(feasibility.givers),
            count: feasibility.givers.length,
          })
        : t(
            'validation.drawImpossible',
            '{givers} can only draw {recipients}, so someone would be left without a name.',
            {
              givers: listOf(feasibility.givers),
              recipients: listOf(feasibility.recipients),
              count: feasibility.givers.length,
            },
          );
  const problems: Partial<Record<FormField | 'date' | 'budget', string>> = {};
  if (!locked && impossibleMessage) problems.exclusions = impossibleMessage;
  if (!locked && participants.length < 2)
    problems.names = t('validation.atLeastTwoNames', 'Write at least 2 names to draw.');
  else if (lineMessage) problems.names = lineMessage;
  else if (localError) problems.names = localError;
  if (dateIncomplete) problems.date = t('validation.dateNotReal', "This date doesn't exist.");
  // Once drawn, an event that already happened keeps its date so the rest can still be edited.
  else if (
    isPastDay(details.date, localToday()) &&
    !(drawn && details.date === raffle?.details?.date)
  )
    problems.date = t('validation.datePast', 'That date has already passed.');
  if (!budgetIsValid(effectiveDetails))
    problems.budget = t('validation.budgetIncomplete', 'Finish the budget or clear it.');
  const firstProblem = (
    ['names', 'exclusions', 'title', 'date', 'budget', 'details', 'rules'] as const
  ).find((field) => problems[field]);
  const serverProblem =
    state.field && state.error && state.input === payload ? state.field : undefined;
  const shownError = (field: FormField | 'date' | 'budget') =>
    (checked ? problems[field] : undefined) ?? (serverProblem === field ? state.error : undefined);
  function tryDraw() {
    setChecked(true);
    if (firstProblem) {
      turnTo(
        PAGE_OF_FIELD[
          firstProblem === 'date' || firstProblem === 'budget' ? 'details' : firstProblem
        ],
      );
      return;
    }
    if (ripped) return;
    setRipFrom(state);
    // The rip lands as the sheet snaps free of the spiral, a third of a second into the tug.
    playSound('tear', { delay: 0.2 });
  }
  return (
    <form action={action} className="raffle-form">
      {/* Enter in a field must never fall through to the archive or draw buttons. */}
      <button type="submit" disabled hidden aria-hidden="true" tabIndex={-1} />
      <input
        type="hidden"
        name="input"
        value={JSON.stringify({
          title,
          rules,
          details: submittedDetails,
          participants,
          exclusions,
        })}
      />
      {raffle && (
        <>
          <input type="hidden" name="id" value={raffle.id} />
          <input type="hidden" name="version" value={version} />
        </>
      )}
      <div className="organizer-desk notebook-only">
        {inCeremony && <DrawCeremony names={participants.map((p) => p.name)} onDone={submitDraw} />}
        <div className={`notebook-wrap paper-shadow ${loose ? 'loose' : ''}`}>
          {raffle && !archived && (
            <output className={`autosave-status desk-status ${autosave.error ? 'error' : ''}`}>
              {autosave.error ||
                (autosave.saving || savePayload !== savedPayload ? (
                  t('raffleForm.saving', 'Saving…')
                ) : (
                  <>
                    <Icon name="check" width="14" height="14" />
                    {t('raffleForm.allSaved', 'All saved')}
                  </>
                ))}
            </output>
          )}
          {!loose && <NotebookRings side="back" />}
          <div
            role="tablist"
            aria-label={t('raffleForm.notebookPages', 'Notebook pages')}
            aria-owns={PAGES.map((_, i) => `${pageId}-tab-${i}`).join(' ')}
          />
          <MotionConfig reducedMotion="user">
            <motion.div
              className="notebook-pages"
              style={{ transformPerspective: 1400, transformOrigin: '0 50%' }}
              initial={false}
              animate={ripped ? 'ripped' : 'bound'}
              variants={RIP}
              onAnimationComplete={(definition) => {
                if (definition !== 'ripped') return;
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                  drawRef.current?.form?.requestSubmit(drawRef.current);
                else setCeremonyFrom(state);
              }}
            >
              <Sheet {...sheet} index={0} className="names-page">
                <fieldset disabled={pending || locked}>
                  <legend className="sr-only">
                    {t('raffleForm.participants', 'Participants')}
                  </legend>
                  <h2 id={`${pageId}-heading-0`} tabIndex={-1}>
                    {locked
                      ? t('raffleForm.whoTookPart', 'Who took part')
                      : t('raffleForm.whosTakingPart', "Who's taking part?")}
                  </h2>
                  <LineupNote
                    names
                    archived={archived}
                    locked={locked}
                    drawn={drawn}
                    changed={lineupChanged}
                    onUndo={undoLineup}
                  />
                  <TeacherMark error={shownError('names')}>
                    {(describedBy) => (
                      <div className="notebook-field rules-field names-field">
                        <CleanCopyField
                          clean={cleanNames}
                          as="textarea"
                          growByLine
                          tabToNextLine
                          className="written-input ruled-input names-input"
                          id="names"
                          aria-labelledby={`${pageId}-heading-0`}
                          aria-describedby={describedBy}
                          aria-invalid={!!shownError('names')}
                          value={shownNames}
                          onValue={writeNames}
                          onLeave={commitNames}
                          rows={3}
                          placeholder={sampleNames}
                          maxLength={10000}
                        />
                        {!locked && (
                          <LineSquiggles
                            fieldId="names"
                            text={shownNames}
                            marked={new Set(lineIssues.keys())}
                          />
                        )}
                      </div>
                    )}
                  </TeacherMark>
                  {!locked && lineMessage && shownError('names') !== lineMessage && (
                    <p className="teacher-note" aria-live="polite">
                      {lineMessage}
                    </p>
                  )}
                </fieldset>
                <nav className="page-turns">
                  <button
                    type="button"
                    className="text-link page-turn next"
                    onClick={() => turnTo(1)}
                  >
                    {t('raffleForm.exclusions', 'Exclusions')} <Icon name="arrow" />
                  </button>
                </nav>
              </Sheet>
              <Sheet {...sheet} index={1} className="exceptions-page">
                <fieldset disabled={pending || locked}>
                  <legend className="sr-only">
                    {t('raffleForm.drawExclusions', 'Draw exclusions')}
                  </legend>
                  <h2 id={`${pageId}-heading-1`} tabIndex={-1}>
                    {t('raffleForm.whoShouldntDrawWhom', "Who shouldn't draw whom?")}{' '}
                  </h2>
                  {drawn || locked ? (
                    <LineupNote
                      names={false}
                      archived={archived}
                      locked={locked}
                      drawn={drawn}
                      changed={lineupChanged}
                      onUndo={undoLineup}
                    />
                  ) : (
                    <p className="notebook-footnote">
                      {t(
                        'raffleForm.nobodyDrawsTheirOwnHint',
                        "For example, couples or siblings who shouldn't draw each other.",
                      )}
                    </p>
                  )}
                  {!locked && shown.participants.length > 2 && (
                    <p className="exclusion-group">
                      <strong>{t('raffleForm.groupPrefix', 'Group:')}</strong>
                      <HighlightBox inline className="exclusion-pick">
                        <GroupPicker
                          people={shown.participants}
                          value={groupDraft}
                          onValue={setGroupDraft}
                          placeholder={t('raffleForm.addSomeone', '+ someone')}
                          label={t('raffleForm.groupAdd', 'People in the group')}
                        />
                      </HighlightBox>
                      <span>{t('raffleForm.groupApart', 'never draw each other')}</span>
                      {groupDraft.length > 1 && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => {
                            const pairs = groupDraft.flatMap((from) =>
                              groupDraft.filter((to) => to !== from).map((to) => ({ from, to })),
                            );
                            setExclusions((es) => [
                              ...es,
                              ...pairs.filter(
                                (x) => !es.some((y) => y.from === x.from && y.to === x.to),
                              ),
                            ]);
                            setGroupDraft([]);
                          }}
                        >
                          {t('raffleForm.groupSave', 'Write it down')}
                        </button>
                      )}
                    </p>
                  )}
                  <TeacherMark error={shownError('exclusions')}>
                    {() =>
                      shown.participants.length < 2 ? (
                        <p className="notebook-footnote exclusion-empty">
                          {withLink(
                            t(
                              'raffleForm.fillNamesToSetExclusions',
                              '{link} to set up the exclusions.',
                              {
                                link: LINK_SLOT,
                              },
                            ),
                            <button type="button" className="text-link" onClick={() => turnTo(0)}>
                              {t('raffleForm.fillNamesLink', 'Fill in the names')}
                            </button>,
                          )}
                        </p>
                      ) : (
                        <ul className="exclusion-rows">
                          {shown.participants
                            .filter(
                              (giver) =>
                                !locked || shown.exclusions.some((e) => e.from === giver.id),
                            )
                            .map((giver) => {
                              const blocked = shown.exclusions.filter((e) => e.from === giver.id);
                              const open = shown.participants.filter(
                                (p) => p.id !== giver.id && !blocked.some((e) => e.to === p.id),
                              );
                              return (
                                <li
                                  key={giver.id}
                                  className={blocked.length ? 'has-exclusions' : ''}
                                >
                                  <strong>
                                    {stuck.has(giver.id) && !locked ? (
                                      <InkSquiggle seed={giver.name.length}>
                                        {giver.name}
                                      </InkSquiggle>
                                    ) : (
                                      giver.name
                                    )}
                                  </strong>{' '}
                                  <span className="restriction-word">
                                    {t('raffleForm.cannotDraw', 'cannot draw')}
                                  </span>{' '}
                                  {blocked.map((e, index) => (
                                    <span
                                      key={e.to}
                                      className={`excluded-name ${suggested === `${e.from}:${e.to}` ? 'suggested' : ''}`}
                                    >
                                      {locked ? (
                                        personName(e.to)
                                      ) : (
                                        <button
                                          type="button"
                                          className="strike-name"
                                          aria-label={t(
                                            'raffleForm.removeExclusionFrom',
                                            'Remove exclusion from {from} to {to}',
                                            { from: giver.name, to: personName(e.to) ?? '' },
                                          )}
                                          onClick={() =>
                                            setExclusions((es) => es.filter((x) => x !== e))
                                          }
                                        >
                                          {personName(e.to)}
                                        </button>
                                      )}
                                      {suggested === `${e.from}:${e.to}` && (
                                        <button
                                          type="button"
                                          className="reject-suggestion"
                                          title={t(
                                            'raffleForm.rejectReverse',
                                            '{giver} can draw {name}',
                                            { giver: giver.name, name: personName(e.to) ?? '' },
                                          )}
                                          aria-label={t(
                                            'raffleForm.rejectReverse',
                                            '{giver} can draw {name}',
                                            { giver: giver.name, name: personName(e.to) ?? '' },
                                          )}
                                          onClick={() => {
                                            setExclusions((es) => es.filter((x) => x !== e));
                                            setSuggested(null);
                                          }}
                                        >
                                          <Icon name="close" />
                                        </button>
                                      )}
                                      {index < blocked.length - 1 && ', '}
                                    </span>
                                  ))}
                                  {!locked && open.length > 0 && (
                                    <HighlightBox inline className="exclusion-pick">
                                      <select
                                        className="paper-select exclusion-add"
                                        aria-label={t(
                                          'raffleForm.addExclusionFor',
                                          'Someone {name} should not draw',
                                          { name: giver.name },
                                        )}
                                        value=""
                                        onChange={(e) => {
                                          const to = e.target.value;
                                          if (!to) return;
                                          const has = (from: string, to: string) =>
                                            exclusions.some((y) => y.from === from && y.to === to);
                                          const reverse = !has(to, giver.id);
                                          setExclusions((es) => [
                                            ...es,
                                            { from: giver.id, to },
                                            ...(reverse ? [{ from: to, to: giver.id }] : []),
                                          ]);
                                          setSuggested(reverse ? `${to}:${giver.id}` : null);
                                        }}
                                      >
                                        <option value="">
                                          {blocked.length
                                            ? t('raffleForm.addAnother', '+ another')
                                            : t('raffleForm.addSomeone', '+ someone')}
                                        </option>
                                        {open.map((p) => (
                                          <option key={p.id} value={p.id}>
                                            {p.name}
                                          </option>
                                        ))}
                                      </select>
                                    </HighlightBox>
                                  )}
                                </li>
                              );
                            })}
                        </ul>
                      )
                    }
                  </TeacherMark>
                  {!locked &&
                    impossibleMessage &&
                    shownError('exclusions') !== impossibleMessage && (
                      <p className="teacher-note" aria-live="polite">
                        {impossibleMessage}
                      </p>
                    )}
                </fieldset>
                <nav className="page-turns">
                  <button type="button" className="text-link page-turn" onClick={() => turnTo(0)}>
                    <Icon name="back" />
                    {t('raffleForm.names', 'Names')}{' '}
                  </button>
                  <button
                    type="button"
                    className="text-link page-turn next"
                    onClick={() => turnTo(2)}
                  >
                    {t('raffleForm.details', 'Details')} <Icon name="arrow" />
                  </button>
                </nav>
              </Sheet>
              <Sheet {...sheet} index={2}>
                <fieldset disabled={pending || archived}>
                  <legend className="sr-only">
                    {t('raffleForm.exchangeDetailsRules', 'Exchange details and rules')}
                  </legend>
                  <h2 id={`${pageId}-heading-2`} tabIndex={-1}>
                    {t('raffleForm.ourPlans', 'Our plans')}{' '}
                  </h2>
                  <div className="notebook-field">
                    <label htmlFor="occasion">
                      {t('raffleForm.occasion', 'Occasion')}{' '}
                      <span>{t('raffleForm.optional', 'optional')}</span>
                    </label>
                    <TeacherMark error={shownError('title')}>
                      {(describedBy) => (
                        <CleanCopyField
                          className="written-input"
                          id="occasion"
                          aria-describedby={describedBy}
                          maxLength={120}
                          value={details.occasion}
                          onValue={(value) => setDetails((d) => ({ ...d, occasion: value }))}
                          placeholder={t(
                            'raffleForm.christmasBirthdayGetTogether',
                            'Christmas, a birthday, a get-together…',
                          )}
                          autoComplete="off"
                        />
                      )}
                    </TeacherMark>
                  </div>
                  <TeacherMark error={shownError('details')}>
                    {() => (
                      <div className="exchange-details">
                        <div className="exchange-details-fields">
                          <div className="notebook-field exchange-when">
                            <label htmlFor="exchange-date" id="exchange-date-label">
                              {t('raffleForm.exchangeDate', 'Exchange date')}
                            </label>
                            <div className="date-time">
                              <TeacherMark error={shownError('date')} className="date-mark">
                                {() => (
                                  <SegmentedDate
                                    id="exchange-date"
                                    labelledBy="exchange-date-label"
                                    disabled={pending || archived}
                                    value={details.date}
                                    onValue={(value) => setDetails((d) => ({ ...d, date: value }))}
                                    onIncomplete={setDateIncomplete}
                                  />
                                )}
                              </TeacherMark>
                              {/* On a narrow page the time drops to the next line, with its "at". */}
                              <span className="date-time-at">
                                <span className="date-time-joiner" aria-hidden="true">
                                  {t('raffleForm.atTime', 'at')}
                                </span>
                                <HighlightBox className="exchange-time">
                                  <input
                                    type="time"
                                    className="written-input"
                                    aria-label={t('raffleForm.timeOptional', 'Time (optional)')}
                                    value={details.time}
                                    onChange={(e) =>
                                      setDetails((d) => ({ ...d, time: e.target.value }))
                                    }
                                  />
                                </HighlightBox>
                              </span>
                            </div>
                          </div>
                          <div className="notebook-field exchange-location">
                            <label htmlFor="location">{t('raffleForm.location', 'Location')}</label>
                            <CleanCopyField
                              className="written-input"
                              id="location"
                              maxLength={120}
                              value={details.location}
                              onValue={(value) => setDetails((d) => ({ ...d, location: value }))}
                              placeholder={t(
                                'raffleForm.locationPlaceholder',
                                "{name}'s place, the office, a restaurant…",
                                { name: sampleHost },
                              )}
                              autoComplete="off"
                            />
                          </div>
                          <div className="notebook-field exchange-theme">
                            <label htmlFor="theme">{t('raffleForm.giftTheme', 'Gift theme')}</label>
                            <CleanCopyField
                              className="written-input"
                              id="theme"
                              maxLength={240}
                              value={details.theme}
                              onValue={(value) => setDetails((d) => ({ ...d, theme: value }))}
                              placeholder={t(
                                'raffleForm.somethingHandmadeBooksSweets',
                                'Something handmade, books, sweets…',
                              )}
                            />
                          </div>
                          <TeacherMark error={shownError('budget')}>
                            {() => (
                              // Leaving the budget line tidies it: a reversed range flips, one amount reads "about".
                              <span
                                className="budget-line"
                                onBlur={(event) => {
                                  if (
                                    !event.currentTarget.contains(
                                      event.relatedTarget as Node | null,
                                    )
                                  )
                                    setDetails((d) => normalizeBudget(d));
                                }}
                              >
                                <BudgetSentence
                                  disabled={pending || archived}
                                  value={effectiveDetails}
                                  onValue={(budget) => {
                                    if (budget.currency !== effectiveDetails.currency)
                                      setCurrencyEdited(true);
                                    setDetails((d) => ({ ...d, ...budget }));
                                  }}
                                />
                              </span>
                            )}
                          </TeacherMark>
                        </div>
                      </div>
                    )}
                  </TeacherMark>
                  <div className="notebook-field rules-field">
                    <label htmlFor="rules">
                      {t('raffleForm.rulesDetails', 'Rules and details')}{' '}
                      <span>{t('raffleForm.optional', 'optional')}</span>
                    </label>
                    <CleanCopyField
                      as="textarea"
                      growByLine
                      tabToNextLine
                      className="written-input ruled-input extra-rules"
                      id="rules"
                      extraLineOnGrow={false}
                      value={rules}
                      onValue={setRules}
                      maxLength={5000}
                      rows={2}
                      placeholder={t('raffleForm.anyExtraInstructions', 'Any extra instructions?')}
                    />
                  </div>
                  <p className="notebook-footnote">
                    {t('raffleForm.canUpdateDetailsLater', 'You can update the details later.')}
                  </p>
                </fieldset>
                <div aria-live="polite" className="page-notices">
                  {state.error && !state.field && (
                    <p className="teacher-note" role="alert">
                      {state.error}
                    </p>
                  )}
                  {state.success && (
                    <p className="notebook-footnote page-success">
                      <Icon name="check" /> {state.success}
                    </p>
                  )}
                </div>
                <nav className="page-turns">
                  <button type="button" className="text-link page-turn" onClick={() => turnTo(1)}>
                    <Icon name="back" />
                    {t('raffleForm.exclusions', 'Exclusions')}{' '}
                  </button>
                  {canDraw && (
                    <button
                      type="button"
                      className="button small page-cta"
                      disabled={pending || autosave.saving}
                      onClick={tryDraw}
                    >
                      {drawLabel} <Icon name="arrow" />
                    </button>
                  )}
                </nav>
              </Sheet>
            </motion.div>
          </MotionConfig>
          {!loose && <NotebookRings side="front" />}
        </div>
      </div>
      {canDraw && (
        <button
          ref={drawRef}
          type="submit"
          name="intent"
          value={drawn ? 'redraw' : 'draw'}
          hidden
          aria-hidden="true"
          tabIndex={-1}
        />
      )}
      {!raffle && (
        <p className="session-note">
          <Icon name="lock" />
          {t(
            'raffleForm.useBrowserReturnExchanges',
            'To come back to this exchange, use this same browser. To manage it from another phone or computer, sign in with Google in My exchanges.',
          )}{' '}
        </p>
      )}
      {raffle && !archived && (
        <div className="archive-action">
          <button
            className="text-link danger"
            name="intent"
            value="archive"
            formNoValidate
            disabled={pending}
            onClick={(e) => {
              if (
                !window.confirm(
                  t(
                    'raffleForm.archiveExchangeItsSlips',
                    'Archive this exchange? Its slips will stop working.',
                  ),
                )
              )
                e.preventDefault();
            }}
          >
            {t('raffleForm.archiveExchange', 'Archive exchange')}{' '}
          </button>
          <p>{t('raffleForm.archivingDisablesSlips', 'Archiving disables the slips.')}</p>
        </div>
      )}
    </form>
  );
}

/** Loose sheets rest in a small pile, the open one on top. */
function pileDepth(index: number, page: number) {
  if (index === page) return 0;
  return index < page ? index + 1 : index;
}
const PILE_TILT = [-0.4, 1.1, -1.5];
const SETTLE_EASE = [0.3, 0.7, 0.3, 1] as const;

/** A page and its flag move as one: the flag turns with its page or rides with its loose sheet. */
function Sheet({
  index,
  page,
  pageId,
  loose,
  onTurn,
  onTabKey,
  className = '',
  children,
}: {
  index: number;
  page: number;
  pageId: string;
  loose: boolean;
  onTurn: (index: number) => void;
  onTabKey: (event: KeyboardEvent<HTMLButtonElement>) => void;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  const last = index === PAGES.length - 1;
  const turned = !loose && !last && page > index;
  const depth = pileDepth(index, page);
  const zIndex = loose ? 10 - depth : turned ? 0 : PAGES.length - index;
  // The pile only shuffles once a sheet has been picked; arriving on the page, it is already laid out.
  const [shownPage, setShownPage] = useState(page);
  const [shuffled, setShuffled] = useState(false);
  if (page !== shownPage) {
    setShownPage(page);
    setShuffled(true);
  }
  const layer: TargetAndTransition = loose
    ? depth === 0 && shuffled
      ? {
          x: [null, '58%', '0%'],
          y: [null, -14, 0],
          rotate: [null, 3.5, PILE_TILT[0]!],
          transition: { duration: 0.62, times: [0, 0.45, 1], ease: SETTLE_EASE },
        }
      : {
          x: `${depth * 0.9}%`,
          y: depth * 7,
          rotate: PILE_TILT[depth]!,
          transition: { duration: 0.5, ease: SETTLE_EASE },
        }
    : {};
  // Stacking changes mid-gesture: a turning page stays on top until it has swung away, and a
  // sheet pulled out of a pile slides in front once it clears the others.
  const zDelay = loose ? (depth === 0 ? 0.28 : 0) : turned ? 0.5 : 0;
  return (
    <motion.div
      className="paper-layer"
      initial={false}
      animate={layer}
      style={{ zIndex, transition: `z-index 0s linear ${zDelay}s` }}
    >
      <motion.section
        role="tabpanel"
        id={`${pageId}-page-${index}`}
        aria-labelledby={`${pageId}-tab-${index}`}
        inert={page !== index}
        className={`notebook notebook-page torn-paper ${className}`}
        initial={false}
        animate={loose || !turned ? 'open' : 'turned'}
        variants={TURN}
        // Turns around the wire, which runs through the punched holes 16px in from the edge.
        style={{ transformOrigin: '16px 50%', transformPerspective: 1600 }}
      >
        {children}
        {!loose && <NotebookRings side="holes" />}
      </motion.section>
      <div className="notebook-tabs">
        {PAGES.map((label, i) =>
          i === index ? (
            <button
              key={label[0]}
              type="button"
              role="tab"
              id={`${pageId}-tab-${i}`}
              aria-selected={page === i}
              aria-controls={`${pageId}-page-${i}`}
              tabIndex={page === i ? 0 : -1}
              onClick={() => onTurn(i)}
              onKeyDown={onTabKey}
            >
              {t(label[0], label[1])}
            </button>
          ) : (
            <span key={label[0]} className="tab-slot" aria-hidden="true">
              {t(label[0], label[1])}
            </span>
          ),
        )}
      </div>
    </motion.div>
  );
}

function LineupNote({
  archived,
  locked,
  drawn,
  changed,
  names,
  onUndo,
}: {
  onUndo: () => void;
  names: boolean;
  archived: boolean;
  locked: boolean;
  drawn: boolean;
  changed: boolean;
}) {
  const { t } = useI18n();
  if (archived)
    return (
      <p className="notebook-footnote locked-note">
        <Icon name="lock" />
        {t('raffleForm.exchangeHasBeenArchived', 'This exchange has been archived.')}{' '}
      </p>
    );
  if (locked)
    return (
      <p className="notebook-footnote locked-note">
        <Icon name="lock" />
        {t(
          'raffleForm.someoneHasOpenedSlip',
          'Someone has opened a slip, so participants and exclusions are now fixed.',
        )}{' '}
      </p>
    );
  if (!drawn) return null;
  return (
    <p className={`notebook-footnote redraw-note ${changed ? 'changed' : ''}`}>
      {names
        ? t(
            'raffleForm.redrawNamesNote',
            'Changing the names draws again. People who stay keep their link; anyone new, or whose name is rewritten, gets a new one.',
          )
        : t(
            'raffleForm.redrawExclusionsNote',
            'Changing the exclusions draws again, and the links stay the same.',
          )}
      {changed && (
        <>
          {' '}
          <button type="button" className="text-link" onClick={onUndo}>
            {t('raffleForm.undoParticipantChanges', 'Undo participant changes')}
          </button>
        </>
      )}
    </p>
  );
}
