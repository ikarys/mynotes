export function titleFrom(text: string): string {
	for (const line of text.split('\n')) {
		const trimmed = line.trim();
		if (trimmed) {
			return trimmed.replace(/\s+/g, ' ').slice(0, 60);
		}
	}
	return '';
}

export function relativeTime(ms: number, now = Date.now()): string {
	const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
	const delta = ms - now;
	const abs = Math.abs(delta);

	if (abs < 60_000) return rtf.format(Math.round(delta / 1_000), 'second');
	if (abs < 3_600_000) return rtf.format(Math.round(delta / 60_000), 'minute');
	if (abs < 86_400_000) return rtf.format(Math.round(delta / 3_600_000), 'hour');
	if (abs < 30 * 86_400_000) return rtf.format(Math.round(delta / 86_400_000), 'day');
	if (abs < 365 * 86_400_000) return rtf.format(Math.round(delta / (30 * 86_400_000)), 'month');
	return rtf.format(Math.round(delta / (365 * 86_400_000)), 'year');
}

export type DayGroup = 'Today' | 'Yesterday' | 'Earlier';

/** Local calendar day, not a 24 h window: a note from 23:50 is "Yesterday" at 00:10. */
export function dayGroup(ms: number, now = Date.now()): DayGroup {
	const startOfToday = new Date(now);
	startOfToday.setHours(0, 0, 0, 0);
	const today = startOfToday.getTime();
	if (ms >= today) return 'Today';
	startOfToday.setDate(startOfToday.getDate() - 1);
	if (ms >= startOfToday.getTime()) return 'Yesterday';
	return 'Earlier';
}
