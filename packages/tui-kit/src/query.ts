/**
 * The switches of a table that change what is loaded. The body of the individual and the
 * species are not values a dial carries: each one is a different export, so the page is opened
 * again with the choice in its address. The address is then also what is handed to somebody who
 * wants the same table tomorrow.
 */

/** Opens the same page with `name` set to `value`, or without it when that is the default. */
export function chooseQuery(name: string, value: string, fallback: string): void {
  const url = new URL(window.location.href);
  if (value === fallback) url.searchParams.delete(name);
  else url.searchParams.set(name, value);
  if (url.href === window.location.href) return;
  window.location.assign(url.href);
}
