export function yesNo(value: boolean): string {
	return value ? "Да" : "Нет";
}

export function fmt(v: number | null): string {
	return v != null ? v.toLocaleString("ru") : "—";
}

export function schoolWord(n: number): string {
	const abs = Math.abs(n) % 100;
	const last = abs % 10;
	if (abs > 10 && abs < 20) return "школ";
	if (last === 1) return "школа";
	if (last >= 2 && last <= 4) return "школы";
	return "школ";
}

export function siteUrl(site: string | null): string | null {
	if (!site) return null;
	return site.startsWith("http") ? site : `https://${site}`;
}

export function calcFillRate(
	students: number | null,
	capacity: number | null,
): number {
	const s = students ?? 0;
	const c = capacity ?? 0;
	return c > 0 ? (s / c) * 100 : 0;
}

export function statusClass(
	value: boolean,
	tone: "positive" | "negative" | "neutral",
): string {
	if (tone === "positive") {
		return value
			? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
			: "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300";
	}

	if (tone === "negative") {
		return value
			? "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
			: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
	}

	return value
		? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
		: "bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300";
}
