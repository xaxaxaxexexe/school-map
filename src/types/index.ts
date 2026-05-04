export type ExtraType = "numeric" | "boolean" | "percent";

export interface ExtraColumn {
	key: string; // canonical key (lowercased, normalized)
	label: string; // original header text from Excel (cleaned)
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
	// Raw extras from district row (used as fallback when no school-level data)
	district_row_extras: Record<string, ExtraValue>;
}
