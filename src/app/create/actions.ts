"use server";
import { kv } from "@vercel/kv";

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
  console.log(names);
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

    const randomName = getRandomItem(availableNames);

    await kv.set(code, randomName);

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

function getRandomItem<T>(set: Set<T>) {
  const items = Array.from(set);
  return items[Math.floor(Math.random() * items.length)];
}
