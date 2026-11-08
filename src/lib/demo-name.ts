import { useSyncExternalStore } from 'react';

const DEMO_NAMES = [
  'Marina',
  'João',
  'Ana Clara',
  'Rafael',
  'Beatriz',
  'Lucas',
  'Camila',
  'Thiago',
  'Juliana',
  'Pedro',
  'Larissa',
  'Gabriel',
  'Fernanda',
  'Mateus',
  'Letícia',
  'Bruno',
  'Carolina',
  'Gustavo',
  'Isabela',
  'Felipe',
  'Helena',
  'Davi',
  'Sofia',
  'Caio',
];
const SERVER_NAME = 'Marina';
let picked: string | undefined;
const subscribeNever = () => () => {};
function clientName() {
  picked ??= DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)] ?? SERVER_NAME;
  return picked;
}

/** A sample recipient for the landing-page demo, drawn once per page load in the browser. */
export function useDemoName() {
  return useSyncExternalStore(subscribeNever, clientName, () => SERVER_NAME);
}

const SERVER_LIST = 'Ana\nBruno\nCarla';
let pickedList: string | undefined;
function clientList() {
  if (pickedList === undefined) {
    const pool = [...DEMO_NAMES];
    const names: string[] = [];
    while (names.length < 3 && pool.length) {
      names.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    }
    pickedList = names.join('\n');
  }
  return pickedList;
}

/** Three different sample names, one per line, drawn once per page load in the browser. */
export function useDemoNameList() {
  return useSyncExternalStore(subscribeNever, clientList, () => SERVER_LIST);
}
