import { useState, useMemo } from "react";
import { useAppSelector } from "@/store/hooks";
import { DISTRICT_GEO } from "@/data/districts";
import type { District, School } from "@/types";
import { schoolBuildingsCount } from "@/lib/format";

export interface DistrictRow {
	district: District;
	shortName: string;
	color: string;
	schoolCount: number;
	totalCapacity: number;
	studentsWithCapacity: number;
	fillRate: number;
	schools: School[];
	buildings: number;
	repairBuildings: number;
	criticalBuildings: number;
	repairBuildingsRate: number;
	criticalBuildingsRate: number;
	secondShiftStudents: number;
	repairSchools: number;
	repairCapacity: number;
	formSchools: number;
	formCapacity: number;
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
	buildings: number;
	repairBuildings: number;
	criticalBuildings: number;
	repairBuildingsRate: number;
	criticalBuildingsRate: number;
	secondShiftStudents: number;
	repairSchools: number;
	repairCapacity: number;
	formSchools: number;
	formCapacity: number;
}

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
	key: K;
	dir: SortDir;
}

export function useDashboardData() {
	const {
		districts: allDistricts,
		schools: allSchools,
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

	const rows = useMemo<DistrictRow[]>(() => {
		if (!loaded) return [];
		return allDistricts
			.filter((d) => d.id !== null)
			.map((district) => {
				const geo = DISTRICT_GEO[district.name];
				const schools = allSchools.filter((s) => s.district === district.name);
				const totalCapacity = schools.reduce(
					(s, x) => s + (x.capacity ?? 0),
					0,
				);
				const studentsWithCapacity = schools.reduce(
					(sum, school) =>
						school.capacity != null ? sum + (school.students ?? 0) : sum,
					0,
				);
				const buildings = schools.reduce(
					(sum, school) => sum + schoolBuildingsCount(school),
					0,
				);
				const repairBuildings = schools.reduce(
					(sum, school) =>
						sum + (school.needs_repairs ? schoolBuildingsCount(school) : 0),
					0,
				);
				const criticalBuildings = schools.reduce(
					(sum, school) =>
						sum +
						(school.critical_condition ? schoolBuildingsCount(school) : 0),
					0,
				);
				const secondShiftStudents = schools.reduce(
					(sum, school) => sum + (school.second_shift_students ?? 0),
					0,
				);
				const repairSchools = schools.filter(
					(school) => school.needs_repairs,
				).length;
				const repairCapacity = schools.reduce(
					(sum, school) =>
						sum + (school.needs_repairs ? (school.capacity ?? 0) : 0),
					0,
				);
				const formSchools = schools.filter((school) => school.form).length;
				const formCapacity = schools.reduce(
					(sum, school) => sum + (school.form ? (school.capacity ?? 0) : 0),
					0,
				);
				const fillRate =
					totalCapacity > 0 ? (studentsWithCapacity / totalCapacity) * 100 : 0;
				return {
					district,
					shortName: geo?.shortName ?? district.name,
					color: geo?.color ?? "#3b82f6",
					schoolCount: schools.length,
					totalCapacity,
					studentsWithCapacity,
					fillRate,
					schools,
					buildings,
					repairBuildings,
					criticalBuildings,
					repairBuildingsRate:
						buildings > 0 ? (repairBuildings / buildings) * 100 : 0,
					criticalBuildingsRate:
						buildings > 0 ? (criticalBuildings / buildings) * 100 : 0,
					secondShiftStudents,
					repairSchools,
					repairCapacity,
					formSchools,
					formCapacity,
				};
			});
	}, [allDistricts, allSchools, loaded]);

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
		const getVal = (r: DistrictRow): number => {
			switch (key) {
				case "fillRate":
					return r.fillRate;
				case "repairBuildingsRate":
					return r.repairBuildingsRate;
				case "criticalBuildingsRate":
					return r.criticalBuildingsRate;
				case "schoolCount":
					return r.schoolCount;
				case "totalCapacity":
					return r.totalCapacity;
				case "students":
					return r.district.students ?? 0;
				case "monitoringScore":
					return r.district.monitoring_score ?? -Infinity;
				case "secondShiftStudents":
					return r.secondShiftStudents;
				case "repairSchools":
					return r.repairSchools;
				case "repairCapacity":
					return r.repairCapacity;
				case "formSchools":
					return r.formSchools;
				case "formCapacity":
					return r.formCapacity;
				case "workers":
					return r.district.workers ?? 0;
				case "buildings":
					return r.buildings;
				default:
					return 0;
			}
		};
		if (key === "name") {
			return filtered.sort(
				(a, b) => m * a.shortName.localeCompare(b.shortName, "ru"),
			);
		}
		return filtered.sort((a, b) => m * (getVal(a) - getVal(b)));
	}, [rows, districtQuery, districtSort]);

	const totals = useMemo<DashboardTotals>(() => {
		const students = rows.reduce((s, r) => s + (r.district.students ?? 0), 0);
		const studentsWithCapacity = rows.reduce(
			(s, r) => s + r.studentsWithCapacity,
			0,
		);
		const capacity = rows.reduce((s, r) => s + r.totalCapacity, 0);
		const teachers = rows.reduce((s, r) => s + (r.district.teachers ?? 0), 0);
		const workers = rows.reduce((s, r) => s + (r.district.workers ?? 0), 0);
		const schools = rows.reduce((s, r) => s + r.schoolCount, 0);
		const buildings = rows.reduce((s, r) => s + r.buildings, 0);
		const repairBuildings = rows.reduce((s, r) => s + r.repairBuildings, 0);
		const criticalBuildings = rows.reduce((s, r) => s + r.criticalBuildings, 0);
		const secondShiftStudents = rows.reduce(
			(s, r) => s + r.secondShiftStudents,
			0,
		);
		const repairSchools = rows.reduce((s, r) => s + r.repairSchools, 0);
		const repairCapacity = rows.reduce((s, r) => s + r.repairCapacity, 0);
		const formSchools = rows.reduce((s, r) => s + r.formSchools, 0);
		const formCapacity = rows.reduce((s, r) => s + r.formCapacity, 0);
		const fillRate = capacity > 0 ? (studentsWithCapacity / capacity) * 100 : 0;
		const demand = Math.max(0, studentsWithCapacity - capacity);
		return {
			students,
			capacity,
			teachers,
			workers,
			schools,
			fillRate,
			demand,
			districts: rows.length,
			buildings,
			repairBuildings,
			criticalBuildings,
			repairBuildingsRate:
				buildings > 0 ? (repairBuildings / buildings) * 100 : 0,
			criticalBuildingsRate:
				buildings > 0 ? (criticalBuildings / buildings) * 100 : 0,
			secondShiftStudents,
			repairSchools,
			repairCapacity,
			formSchools,
			formCapacity,
		};
	}, [rows]);

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
		const getNum = (s: School): number => {
			switch (key) {
				case "capacity":
					return s.capacity ?? 0;
				case "students":
					return s.students ?? 0;
				case "primary_students":
					return s.primary_students ?? 0;
				case "middle_students":
					return s.middle_students ?? 0;
				case "ninth_grade_students":
					return s.ninth_grade_students ?? 0;
				case "tenth_grade_students":
					return s.tenth_grade_students ?? 0;
				case "eleventh_grade_students":
					return s.eleventh_grade_students ?? 0;
				case "ege_stem_share":
					return s.ege_stem_share ?? 0;
				case "second_shift_students":
					return s.second_shift_students ?? 0;
				case "workers":
					return s.workers ?? 0;
				case "students_per_worker":
					return s.students_per_worker ?? 0;
				case "admin_staff":
					return s.admin_staff ?? 0;
				case "admin_staff_share":
					return s.admin_staff_share ?? 0;
				case "teachers":
					return s.teachers ?? 0;
				case "other_staff":
					return s.other_staff ?? 0;
				case "other_staff_share":
					return s.other_staff_share ?? 0;
				case "buildings":
					return schoolBuildingsCount(s);
				case "needs_repairs":
					return s.needs_repairs ? 1 : 0;
				case "critical_condition":
					return s.critical_condition ? 1 : 0;
				case "renovated":
					return s.renovated ? 1 : 0;
				case "form":
					return s.form ? 1 : 0;
				case "shkon":
					return s.shkon ? 1 : 0;
				case "a_school_with_bias":
					return s.a_school_with_bias ? 1 : 0;
				default:
					return 0;
			}
		};
		if (key === "name") {
			return filtered.sort((a, b) => m * a.name.localeCompare(b.name, "ru"));
		}
		if (key === "site") {
			return filtered.sort(
				(a, b) => m * (a.site ?? "").localeCompare(b.site ?? "", "ru"),
			);
		}
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
	};
}
