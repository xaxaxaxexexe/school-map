export type ExtraType = "numeric" | "ratio" | "boolean" | "percent";

export interface ExtraColumn {
	key: string;
	label: string;
	type: ExtraType;
}

export type ExtraValue = number | boolean | null;

export interface School {
	name: string;
	shift: number | null;
	capacity: number | null;
	students: number | null;
	workers: number | null;
	teachers: number | null;
	site: string | null;
	district: string | null;
	address: string | null;
	coords: [number, number] | null;
	monitoring_score: number | null;
	institution_type: string | null;
	extras: Record<string, ExtraValue>;
}

export interface District {
	id: number | null;
	name: string;
	students: number | null;
	workers: number | null;
	teachers: number | null;
	monitoring_score: number | null;
	monitoring_color: string | null;
	district_row_extras: Record<string, ExtraValue>;
}

export interface RepublicTotals {
	students: number | null;
	workers: number | null;
	teachers: number | null;
	capacity: number | null;
	extras: Record<string, ExtraValue>;
}
