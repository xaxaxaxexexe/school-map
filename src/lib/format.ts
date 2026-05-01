import type { School } from "@/types";

export function yesNo(value: boolean): string {
	return value ? "Да" : "Нет";
}

export function fmt(v: number | null): string {
	return v != null ? v.toLocaleString("ru") : "—";
}

export function fmtDecimal(v: number | null, digits = 1): string {
	return v != null
		? v.toLocaleString("ru", { maximumFractionDigits: digits })
		: "—";
}

export function fmtPercent(v: number | null, digits = 1): string {
	if (v == null) return "—";
	const percent = Math.abs(v) <= 1 ? v * 100 : v;
	return `${percent.toLocaleString("ru", { maximumFractionDigits: digits })}%`;
}

export function fmtSecondShiftStudents(
	school: Pick<School, "shift" | "second_shift_students">,
): string {
	if (school.second_shift_students != null) {
		return school.second_shift_students.toLocaleString("ru");
	}

	if (school.shift === 2) return "Н/Д";
	if (school.shift === 1) return "0";

	return "—";
}

export function schoolBuildingsCount(
	school: Pick<School, "buildings">,
): number {
	return school.buildings ?? 1;
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
