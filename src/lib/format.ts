export const naira = (n: number) => `${n < 0 ? '−' : ''}₦${Math.abs(n).toLocaleString('en-NG')}`;

export function shortDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}
