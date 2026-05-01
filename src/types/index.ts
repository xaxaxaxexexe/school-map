export interface District {
	id: number | null;
	name: string;
	students: number | null;
	teachers: number | null;
	workers: number | null;
	monitoring_score: number | null;
}

export interface School {
	name: string;
	shift: number | null;
	capacity: number | null;
	students: number | null;
	primary_students: number | null;
	middle_students: number | null;
	ninth_grade_students: number | null;
	tenth_grade_students: number | null;
	eleventh_grade_students: number | null;
	ege_stem_share: number | null;
	workers: number | null;
	students_per_worker: number | null;
	admin_staff: number | null;
	admin_staff_share: number | null;
	teachers: number | null;
	other_staff: number | null;
	other_staff_share: number | null;
	site: string | null;
	district: string | null;
	is_state: boolean;
	is_religional: boolean;
	second_shift_students: number | null;
	buildings: number | null;
	renovated: boolean;
	needs_repairs: boolean;
	critical_condition: boolean;
	form: boolean;
	shkon: boolean;
	a_school_with_bias: boolean;
	address: string | null;
	coords: [number, number] | null;
}
