"use client";

const STACK_KEY = "schoolos:app-history-stack";
const BACK_TARGET_KEY = "schoolos:app-history-back-target";
const MAX_STACK_LENGTH = 30;

function readStack() {
  try {
    const value = window.sessionStorage.getItem(STACK_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  window.sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-MAX_STACK_LENGTH)));
}

export function recordAppHistory(href: string) {
  const pendingBackTarget = window.sessionStorage.getItem(BACK_TARGET_KEY);
  if (pendingBackTarget === href) {
    window.sessionStorage.removeItem(BACK_TARGET_KEY);
    return;
  }

  const stack = readStack();
  const previous = stack.at(-2);
  const current = stack.at(-1);

  if (current === href) return;

  if (previous === href) {
    writeStack(stack.slice(0, -1));
    return;
  }

  writeStack([...stack, href]);
}

export function previousAppHistoryHref(currentHref: string) {
  const stack = readStack();
  const currentIndex = stack.lastIndexOf(currentHref);
  if (currentIndex > 0) return stack[currentIndex - 1];
  return stack.at(-2);
}

export function prepareAppHistoryBack(currentHref: string, targetHref: string) {
  const stack = readStack();
  const currentIndex = stack.lastIndexOf(currentHref);
  const nextStack = currentIndex >= 0 ? stack.slice(0, currentIndex) : stack.slice(0, -1);

  writeStack(nextStack.length ? nextStack : [targetHref]);
  window.sessionStorage.setItem(BACK_TARGET_KEY, targetHref);
}
