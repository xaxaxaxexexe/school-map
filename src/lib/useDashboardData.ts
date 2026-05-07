import { useState, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { DISTRICT_GEO, computeMonitoringMedian } from "@/data/districts";
import type { District, ExtraColumn, School } from "@/types";

// In filter modes (institutionType !== null) percent and ratio columns can't be
// meaningfully re-aggregated from school rows (no weights), so we drop them.
function canAggregateInFilterMode(type: ExtraColumn["type"]): boolean {
	return type === "numeric" || type === "boolean";
}

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
	if (col.type === "boolean") {
		if (schools.length === 0) return null;
		let truthy = 0;
		for (const s of schools) {
			const v = s.extras?.[col.key];
			if (v === true) truthy += 1;
			else if (typeof v === "number" && v !== 0) truthy += 1;
		}
		return truthy / schools.length;
	}

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

	// percent and ratio: unweighted mean across schools (best-effort fallback)
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
		republicTotals,
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

	const monitoringMedian = useMemo(
		() => computeMonitoringMedian(allDistricts),
		[allDistricts],
	);

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
					let val: number | null = null;
					if (institutionType) {
						if (canAggregateInFilterMode(col.type)) {
							val = aggregateExtra(col, schools);
						}
					} else {
						const rowVal = district.district_row_extras?.[col.key];
						if (rowVal != null) {
							val = typeof rowVal === "boolean" ? (rowVal ? 1 : 0) : rowVal;
						}
						if (val === null) val = aggregateExtra(col, schools);
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
		const useRepublicRow = !institutionType && republicTotals !== null;

		const sumStudents = rows.reduce((s, r) => s + r.totalStudents, 0);
		const sumCapacity = rows.reduce((s, r) => s + r.totalCapacity, 0);
		const sumTeachers = rows.reduce((s, r) => s + r.totalTeachers, 0);
		const sumWorkers = rows.reduce((s, r) => s + r.totalWorkers, 0);
		const studentsWithCapacity = rows.reduce(
			(s, r) => s + r.studentsWithCapacity,
			0,
		);

		const students =
			useRepublicRow && republicTotals?.students != null
				? republicTotals.students
				: sumStudents;
		const capacity =
			useRepublicRow && republicTotals?.capacity != null
				? republicTotals.capacity
				: sumCapacity;
		const teachers =
			useRepublicRow && republicTotals?.teachers != null
				? republicTotals.teachers
				: sumTeachers;
		const workers =
			useRepublicRow && republicTotals?.workers != null
				? republicTotals.workers
				: sumWorkers;
		const schools = rows.reduce((s, r) => s + r.schoolCount, 0);

		const fillRateBaseStudents =
			useRepublicRow && republicTotals?.students != null
				? students
				: studentsWithCapacity;
		const fillRate =
			capacity > 0 ? (fillRateBaseStudents / capacity) * 100 : 0;
		const demand = Math.max(0, fillRateBaseStudents - capacity);

		const extras: Record<string, number | null> = {};
		for (const col of extraColumns) {
			let val: number | null = null;
			if (institutionType) {
				if (canAggregateInFilterMode(col.type)) {
					val = aggregateExtra(col, filteredSchools);
				}
			} else {
				if (useRepublicRow) {
					const repVal = republicTotals?.extras?.[col.key];
					if (repVal != null) {
						val = typeof repVal === "boolean" ? (repVal ? 1 : 0) : repVal;
					}
				}
				if (val === null) {
					const districtVals: number[] = [];
					for (const d of rows) {
						const fb = d.district.district_row_extras?.[col.key];
						if (fb != null) {
							districtVals.push(typeof fb === "boolean" ? (fb ? 1 : 0) : fb);
						}
					}
					if (districtVals.length > 0) {
						val =
							col.type === "numeric"
								? districtVals.reduce((a, b) => a + b, 0)
								: districtVals.reduce((a, b) => a + b, 0) /
									districtVals.length;
					}
				}
				if (val === null) val = aggregateExtra(col, filteredSchools);
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
	}, [rows, extraColumns, filteredSchools, institutionType, republicTotals]);

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
		monitoringMedian,
	};
}
