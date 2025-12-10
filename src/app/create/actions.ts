"use server";

import { redis } from "@/redis";

export type ActionState =
  | {
      type: "success";
      nameToCode: Record<string, string>;
    }
  | {
      type: "error";
      error: string;
    }
  | {
      type: undefined;
    };

/**
 * Each name must be paired to another name.
 *
 * Each name receives a code, mapping to the other name.
 *
 * In the KV:
 *
 * {code: name}
 * {code: name}
 */
export async function createRaffle(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const names = formData.getAll("names");
  if (names.length < 2) {
    return {
      type: "error",
      error: "Must have at least two names",
    };
  }
  const availableNames = new Set(names);
  if (availableNames.size !== names.length) {
    return {
      type: "error",
      error: "Names must be unique",
    };
  }

  if (names.some((name) => typeof name !== "string")) {
    return {
      type: "error",
      error: "Names must be strings",
    };
  }

  const nameToCode: Record<string, string> = {};

  for (const name of names) {
    const code = randomString(4);

    const pickableNames = except(availableNames, name);

    const randomName = getRandomItem(pickableNames);

    await redis.set(code, randomName);

    availableNames.delete(randomName);

    nameToCode[name as string] = code;
  }

  return {
    type: "success",
    nameToCode,
  };
}

/**
 * @see https://stackoverflow.com/a/10727155/8735352
 */
function randomString(length: number) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function except<T>(set: Set<T>, item: T) {
  const newSet = new Set(set);
  newSet.delete(item);
  return newSet;
}

function getRandomItem<T>(set: Set<T>) {
  const items = Array.from(set);
  return items[Math.floor(Math.random() * items.length)];
}
