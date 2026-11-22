/**
 * The switches of a table that change what is loaded. The body of the individual and the
 * species are not values a dial carries: each one is a different export, so the page is opened
 * again with the choice in its address. The address is then also what is handed to somebody who
 * wants the same table tomorrow.
 */

/**
 * Opens the same page with `name` set to `value`, or without it when that is the default.
 * `drop` names what the choice makes stale: the weight of a body belongs to the body it was
 * set on, so a switch to the other one forgets it and takes the reference of the new one.
 */
export function chooseQuery(
  name: string, value: string, fallback: string, drop: readonly string[] = [],
): void {
  const url = new URL(window.location.href);
  if (value === fallback) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  for (const stale of drop) url.searchParams.delete(stale);
  if (url.href === window.location.href) return;
  window.location.assign(url.href);
}
