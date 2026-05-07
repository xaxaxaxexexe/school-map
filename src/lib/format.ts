import type { ExtraType, ExtraValue } from "@/types";

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

export function fmtExtraValue(value: ExtraValue, type: ExtraType): string {
	if (value == null) return "—";
	if (type === "numeric") return fmt(value as number);
	if (type === "ratio") return fmtDecimal(value as number);
	if (type === "boolean") return yesNo(value as boolean);
	if (type === "percent") return fmtPercent(value as number);
	return "—";
}

export function fmtAggregatedExtra(
	value: number | null | undefined,
	type: ExtraType,
): string {
	if (value == null) return "—";
	if (type === "numeric") return fmt(value);
	if (type === "ratio") return fmtDecimal(value);
	return fmtPercent(value);
}
