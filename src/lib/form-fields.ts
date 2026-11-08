/** Long enough for two given names and two surnames; longer reads as a typo or a sentence. */
export const MAX_NAME_LENGTH = 40;
/** Fields the organizer can be pointed back to, and the notebook page each one lives on. */
export type FormField = 'names' | 'exclusions' | 'title' | 'details' | 'rules';
export const PAGE_OF_FIELD: Record<FormField, number> = {
  names: 0,
  exclusions: 1,
  title: 2,
  details: 2,
  rules: 2,
};
const FIELD_OF_ERROR: Record<string, FormField> = {
  'errors.addBetween2100': 'names',
  'errors.checkParticipantNames': 'names',
  'errors.useDistinctNamesIdentify': 'names',
  'errors.checkExclusions': 'exclusions',
  'errors.theseExclusionsPreventValid': 'exclusions',
  'errors.useExchangeNameUp': 'title',
  'errors.checkDateCurrencyBudget': 'details',
  'errors.datePast': 'details',
  'errors.rulesMustAtMost': 'rules',
};
export const fieldOfError = (id: string): FormField | undefined => FIELD_OF_ERROR[id];
