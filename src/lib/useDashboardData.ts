import { useState, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { DISTRICT_GEO } from "@/data/districts";
import type { District, ExtraColumn, School } from "@/types";

export interface DistrictRow {
	district: District;
	shortName: string;
	color: string;
	schoolCount: number;
	totalCapacity: number;
	totalStudents: number;
	totalWorkers: number;
	totalTeachers: number;
	studentsWithCapacity: number;
	fillRate: number;
	demand: number;
	schools: School[];
	extras: Record<string, number | null>;
}

export interface DashboardTotals {
	students: number;
	capacity: number;
	teachers: number;
	workers: number;
	schools: number;
	fillRate: number;
	demand: number;
	districts: number;
	extras: Record<string, number | null>;
}

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
	key: K;
	dir: SortDir;
}

const EXTRA_SORT_PREFIX = "extra:";

function aggregateExtra(
	col: ExtraColumn,
	schools: School[],
): number | null {
	const vals: ExtraValueLike[] = [];
	for (const s of schools) {
		const v = s.extras?.[col.key];
		if (v == null) continue;
		vals.push(v);
	}
	if (vals.length === 0) return null;

	if (col.type === "numeric") {
		let sum = 0;
		for (const v of vals) {
			if (typeof v === "number") sum += v;
			else if (typeof v === "boolean") sum += v ? 1 : 0;
		}
		return sum;
	}

	if (col.type === "boolean") {
		let truthy = 0;
		let total = 0;
		for (const v of vals) {
			total += 1;
			if (typeof v === "boolean") {
				if (v) truthy += 1;
			} else if (typeof v === "number") {
				if (v !== 0) truthy += 1;
			}
		}
		return total > 0 ? truthy / total : null;
	}

	// percent: average of numeric values
	let sum = 0;
	let n = 0;
	for (const v of vals) {
		if (typeof v === "number") {
			sum += v;
			n += 1;
		} else if (typeof v === "boolean") {
			sum += v ? 1 : 0;
			n += 1;
		}
	}
	return n > 0 ? sum / n : null;
}

type ExtraValueLike = number | boolean;

export function useDashboardData() {
	const {
		districts: allDistricts,
		schools: allSchools,
		extraColumns,
		institutionTypes,
		loaded,
	} = useAppSelector((s) => s.data);

	const [districtQuery, setDistrictQuery] = useState("");
	const [schoolQuery, setSchoolQuery] = useState("");
	const [selectedId, setSelectedId] = useState<number | null>(null);
	const [districtSort, setDistrictSort] = useState<SortState<string>>({
		key: "fillRate",
		dir: "asc",
	});
	const [schoolSort, setSchoolSort] = useState<SortState<string>>({
		key: "name",
		dir: "asc",
	});
	const [institutionType, setInstitutionType] = useState<string | null>(null);

	const filteredSchools = useMemo(() => {
		if (!institutionType) return allSchools;
		return allSchools.filter((s) => s.institution_type === institutionType);
	}, [allSchools, institutionType]);

	const rows = useMemo<DistrictRow[]>(() => {
		if (!loaded) return [];
		return allDistricts
			.filter((d) => d.id !== null)
			.map((district) => {
				const geo = DISTRICT_GEO[district.name];
				const schools = filteredSchools.filter(
					(s) => s.district === district.name,
				);
				const totalCapacity = schools.reduce(
					(s, x) => s + (x.capacity ?? 0),
					0,
				);
				const totalStudents = schools.reduce(
					(s, x) => s + (x.students ?? 0),
					0,
				);
				const totalWorkers = schools.reduce(
					(s, x) => s + (x.workers ?? 0),
					0,
				);
				const totalTeachers = schools.reduce(
					(s, x) => s + (x.teachers ?? 0),
					0,
				);
				const studentsWithCapacity = schools.reduce(
					(sum, school) =>
						school.capacity != null ? sum + (school.students ?? 0) : sum,
					0,
				);
				const fillRate =
					totalCapacity > 0 ? (studentsWithCapacity / totalCapacity) * 100 : 0;

				const extras: Record<string, number | null> = {};
				for (const col of extraColumns) {
					let val = aggregateExtra(col, schools);
					if (val === null && !institutionType) {
						const fallback = district.district_row_extras?.[col.key];
						if (fallback != null) {
							if (typeof fallback === "boolean") {
								val = fallback ? 1 : 0;
							} else {
								val = fallback;
							}
						}
					}
					extras[col.key] = val;
				}

				return {
					district,
					shortName: geo?.shortName ?? district.name,
					color: geo?.color ?? "#3b82f6",
					schoolCount: schools.length,
					totalCapacity,
					totalStudents,
					totalWorkers,
					totalTeachers,
					studentsWithCapacity,
					fillRate,
					demand: Math.max(0, studentsWithCapacity - totalCapacity),
					schools,
					extras,
				};
			});
	}, [allDistricts, filteredSchools, loaded, extraColumns, institutionType]);

	const toggleDistrictSort = (key: string) => {
		setDistrictSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: "asc" },
		);
	};

	const toggleSchoolSort = (key: string) => {
		setSchoolSort((prev) =>
			prev.key === key
				? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
				: { key, dir: "asc" },
		);
	};

	const sorted = useMemo(() => {
		const q = districtQuery.toLowerCase();
		const filtered = [...rows].filter(
			(r) => !q || r.shortName.toLowerCase().includes(q),
		);
		const { key, dir } = districtSort;
		const m = dir === "asc" ? 1 : -1;

		if (key === "name") {
			return filtered.sort(
				(a, b) => m * a.shortName.localeCompare(b.shortName, "ru"),
			);
		}

		const getVal = (r: DistrictRow): number => {
			if (key.startsWith(EXTRA_SORT_PREFIX)) {
				const exKey = key.slice(EXTRA_SORT_PREFIX.length);
				return r.extras[exKey] ?? -Infinity;
			}
			switch (key) {
				case "fillRate":
					return r.fillRate;
				case "schoolCount":
					return r.schoolCount;
				case "totalCapacity":
					return r.totalCapacity;
				case "students":
					return r.totalStudents;
				case "workers":
					return r.totalWorkers;
				case "teachers":
					return r.totalTeachers;
				case "monitoringScore":
					return r.district.monitoring_score ?? -Infinity;
				default:
					return 0;
			}
		};
		return filtered.sort((a, b) => m * (getVal(a) - getVal(b)));
	}, [rows, districtQuery, districtSort]);

	const totals = useMemo<DashboardTotals>(() => {
		const students = rows.reduce((s, r) => s + r.totalStudents, 0);
		const studentsWithCapacity = rows.reduce(
			(s, r) => s + r.studentsWithCapacity,
			0,
		);
		const capacity = rows.reduce((s, r) => s + r.totalCapacity, 0);
		const teachers = rows.reduce((s, r) => s + r.totalTeachers, 0);
		const workers = rows.reduce((s, r) => s + r.totalWorkers, 0);
		const schools = rows.reduce((s, r) => s + r.schoolCount, 0);
		const fillRate =
			capacity > 0 ? (studentsWithCapacity / capacity) * 100 : 0;
		const demand = Math.max(0, studentsWithCapacity - capacity);

		const extras: Record<string, number | null> = {};
		for (const col of extraColumns) {
			let val = aggregateExtra(col, filteredSchools);
			if (val === null && !institutionType) {
				// Republic-level fallback: average / sum of district_row_extras across districts when no schools have data
				const fallbackVals: number[] = [];
				for (const d of rows) {
					const fb = d.district.district_row_extras?.[col.key];
					if (fb != null) {
						fallbackVals.push(typeof fb === "boolean" ? (fb ? 1 : 0) : fb);
					}
				}
				if (fallbackVals.length > 0) {
					if (col.type === "numeric") {
						val = fallbackVals.reduce((a, b) => a + b, 0);
					} else {
						val =
							fallbackVals.reduce((a, b) => a + b, 0) / fallbackVals.length;
					}
				}
			}
			extras[col.key] = val;
		}

		return {
			students,
			capacity,
			teachers,
			workers,
			schools,
			fillRate,
			demand,
			districts: rows.length,
			extras,
		};
	}, [rows, extraColumns, filteredSchools, institutionType]);

	const selected =
		selectedId !== null
			? (rows.find((r) => r.district.id === selectedId) ?? null)
			: null;

	const sortedSchools = useMemo(() => {
		if (!selected) return [];
		const q = schoolQuery.toLowerCase();
		const filtered = [...selected.schools].filter(
			(s) =>
				!q ||
				s.name.toLowerCase().includes(q) ||
				(s.address && s.address.toLowerCase().includes(q)),
		);
		const { key, dir } = schoolSort;
		const m = dir === "asc" ? 1 : -1;

		if (key === "name") {
			return filtered.sort((a, b) => m * a.name.localeCompare(b.name, "ru"));
		}
		if (key === "site") {
			return filtered.sort(
				(a, b) => m * (a.site ?? "").localeCompare(b.site ?? "", "ru"),
			);
		}

		const getNum = (s: School): number => {
			if (key.startsWith(EXTRA_SORT_PREFIX)) {
				const exKey = key.slice(EXTRA_SORT_PREFIX.length);
				const v = s.extras?.[exKey];
				if (v == null) return -Infinity;
				if (typeof v === "boolean") return v ? 1 : 0;
				return v;
			}
			switch (key) {
				case "capacity":
					return s.capacity ?? 0;
				case "students":
					return s.students ?? 0;
				case "workers":
					return s.workers ?? 0;
				case "teachers":
					return s.teachers ?? 0;
				case "shift":
					return s.shift ?? 0;
				default:
					return 0;
			}
		};
		return filtered.sort((a, b) => m * (getNum(a) - getNum(b)));
	}, [selected, schoolQuery, schoolSort]);

	return {
		noData: !loaded,
		rows,
		sorted,
		totals,
		selected,
		sortedSchools,
		selectedId,
		setSelectedId,
		districtQuery,
		setDistrictQuery,
		schoolQuery,
		setSchoolQuery,
		districtSort,
		toggleDistrictSort,
		schoolSort,
		toggleSchoolSort,
		institutionType,
		setInstitutionType,
		institutionTypes,
		extraColumns,
	};
}
