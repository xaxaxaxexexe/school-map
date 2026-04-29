import * as XLSX from "xlsx";
import type { District, School } from "@/types";
import { DISTRICT_ID_MAP } from "@/data/districts";

type Cell = string | number | boolean | null | undefined;

const CANONICAL_GROZNY_DISTRICT = "Грозный (город)";
const GROZNY_INTERNAL_DISTRICTS = new Set([
	"ахматовский р-н",
	"висаитовский р-н",
	"шейх-мансуровский р-н",
	"байсангуровский р-н",
]);
const GROZNY_NAME_ALIASES = new Set([
	"грозный",
	"г. грозный",
	"город грозный",
	"грозный (город)",
	"городской округ грозный",
]);
const NEGATIVE_PRESENCE_BOOL_VALUES = new Set([
	"-",
	"—",
	"0",
	"0.0",
	"false",
	"n",
	"no",
	"ytn",
	"нет",
	"нет.",
	"ложь",
	"не отремонтирована",
	"не отремонтировано",
	"не отремонтирован",
	"не проводился",
	"не проводилась",
	"не проводилось",
	"не требуется",
	"не требует",
	"не требуются",
	"нет необходимости",
	"отсутствует",
]);

function isNan(v: Cell): boolean {
	return v == null || (typeof v === "number" && Number.isNaN(v));
}

function toInt(v: Cell): number | null {
	if (isNan(v)) return null;
	const n = Number(v);
	return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toFloat(v: Cell): number | null {
	if (isNan(v)) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function toStr(v: Cell): string | null {
	if (isNan(v)) return null;
	const s = String(v).trim();
	return s || null;
}

function toBool(v: Cell): boolean {
	const s = toStr(v);
	if (!s) return false;
	return ["да", "yes", "true", "1", "y", "истина"].includes(s.toLowerCase());
}

function normalizeDistrictName(v: string | null): string | null {
	if (!v) return null;
	const name = v.trim();
	const normalized = name.toLowerCase().replace(/\s+/g, " ").trim();

	if (
		GROZNY_INTERNAL_DISTRICTS.has(normalized) ||
		GROZNY_NAME_ALIASES.has(normalized)
	) {
		return CANONICAL_GROZNY_DISTRICT;
	}

	return name;
}

function toBoolByPresence(v: Cell): boolean {
	const s = toStr(v);
	if (!s) return false;

	const normalized = s
		.toLowerCase()
		.replace(/\s+/g, " ")
		.replace(/^[\s.;,:]+|[\s.;,:]+$/g, "");

	if (NEGATIVE_PRESENCE_BOOL_VALUES.has(normalized)) return false;

	return !/^(нет[\s/.-]|не треб|не отремонт|не провод)/.test(normalized);
}

function buildingsCount(v: Cell): number {
	return toInt(v) ?? 1;
}

function parseCoords(v: Cell): [number, number] | null {
	const s = toStr(v);
	if (!s) return null;
	const parts = s
		.replace(";", ",")
		.split(",")
		.map((p) => p.trim());
	if (parts.length !== 2) return null;
	const lat = parseFloat(parts[0]!);
	const lon = parseFloat(parts[1]!);
	if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
	return [lat, lon];
}

function normalizeHeader(v: Cell): string {
	const s = toStr(v);
	if (!s) return "";
	return s
		.toLowerCase()
		.replace(/[^0-9a-zа-яё]+/g, "_")
		.replace(/^_|_$/g, "");
}

function headerIndex(header: Cell[], ...names: string[]): number | null;
function headerIndex(header: Cell[], ...args: [...string[], number]): number;
function headerIndex(
	header: Cell[],
	...args: (string | number)[]
): number | null {
	const fallback =
		typeof args[args.length - 1] === "number" ? (args.pop() as number) : null;
	const nameSet = new Set((args as string[]).map(normalizeHeader));
	for (let i = 0; i < header.length; i++) {
		if (nameSet.has(normalizeHeader(header[i]))) return i;
	}
	return fallback;
}

function cell(row: Cell[], idx: number | null): Cell {
	if (idx === null) return null;
	return idx < row.length ? row[idx] : null;
}

function isDistrictRow(name: string | null, site: string | null): boolean {
	if (!name) return false;
	const stripped = name.trim();
	if (stripped.toLowerCase() === "всего") return false;
	if (site) return false;
	const normalized = normalizeDistrictName(stripped);
	return (
		stripped in DISTRICT_ID_MAP ||
		(!!normalized && normalized in DISTRICT_ID_MAP)
	);
}

interface ParsedData {
	districts: District[];
	schools: School[];
}

function buildPayload(districts: District[], schools: School[]): ParsedData {
	const byName = new Map<string, District>();
	for (const d of districts) {
		const normalizedName = normalizeDistrictName(d.name) ?? d.name;
		const current = byName.get(normalizedName);
		if (!current) {
			byName.set(normalizedName, {
				id: DISTRICT_ID_MAP[normalizedName] ?? d.id,
				name: normalizedName,
				students: d.students ?? 0,
				teachers: d.teachers ?? 0,
				workers: d.workers ?? 0,
			});
			continue;
		}

		current.students = (current.students ?? 0) + (d.students ?? 0);
		current.teachers = (current.teachers ?? 0) + (d.teachers ?? 0);
		current.workers = (current.workers ?? 0) + (d.workers ?? 0);
	}

	for (const [name, id] of Object.entries(DISTRICT_ID_MAP)) {
		const normalizedName = normalizeDistrictName(name);
		if (!normalizedName || normalizedName !== name) continue;

		if (byName.has(name)) {
			const cur = byName.get(name)!;
			if (cur.id === null) cur.id = id;
			continue;
		}
		byName.set(name, { id, name, students: 0, teachers: 0, workers: 0 });
	}

	const merged = [...byName.values()].sort(
		(a, b) =>
			(a.id === null ? 1 : 0) - (b.id === null ? 1 : 0) ||
			(a.id ?? 0) - (b.id ?? 0),
	);

	return { districts: merged, schools };
}

export function normalizeParsedData(data: ParsedData): ParsedData {
	const schools = data.schools.map((school) => ({
		...school,
		district: normalizeDistrictName(school.district),
		buildings: school.buildings ?? 1,
	}));
	const districts = data.districts.map((district) => ({
		...district,
		name: normalizeDistrictName(district.name) ?? district.name,
	}));

	return buildPayload(districts, schools);
}

function parseLegacy(rows: Cell[][]): ParsedData {
	const districts: District[] = [];
	const schools: School[] = [];
	let currentDistrict: District | null = null;

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i]!;
		const rowId = row[0];
		const name = toStr(row[1]);
		const nameStripped = name?.trim() ?? null;

		if (isNan(rowId) && isDistrictRow(name, toStr(row[7]))) {
			const districtName = normalizeDistrictName(nameStripped);
			currentDistrict = {
				id: districtName ? DISTRICT_ID_MAP[districtName] ?? null : null,
				name: districtName ?? nameStripped!,
				students: toInt(row[4]),
				workers: toInt(row[5]),
				teachers: toInt(row[6]),
			};
			districts.push(currentDistrict);
			continue;
		}

		const districtName = currentDistrict
			? normalizeDistrictName(currentDistrict.name)
			: null;
		const coords = parseCoords(row[10]);

		if (!districtName && coords === null) continue;

		schools.push({
			name: nameStripped ?? name ?? "",
			shift: toInt(row[2]),
			capacity: toInt(row[3]),
			students: toInt(row[4]),
			workers: toInt(row[5]),
			teachers: toInt(row[6]),
			site: toStr(row[7]),
			district: districtName,
			is_state: toBool(row[8]),
			is_religional: false,
			address: toStr(row[9]),
			coords,
			buildings: 1,
			renovated: false,
			needs_repairs: false,
			critical_condition: false,
			second_shift_students: null,
			form: false,
			shkon: false,
			a_school_with_bias: false,
		});
	}

	return buildPayload(districts, schools);
}

function parseFlat(rows: Cell[][]): ParsedData {
	const header = rows[0]!;

	const schoolIdx = headerIndex(header, "school_name", "Название школы", 1);
	const shiftIdx = headerIndex(header, "shift_count", "Сменность", "Смена", 2);
	const capacityIdx = headerIndex(header, "power", "Мощность", 3);
	const studentsIdx = headerIndex(
		header,
		"student_count",
		"Количество обучающихся",
		"Кол-во учащихся",
		4,
	);
	const workersIdx = headerIndex(
		header,
		"employee_count",
		"Количество работников",
		"Кол-во работников",
		5,
	);
	const teachersIdx = headerIndex(
		header,
		"edu_employee_count",
		"Количество педработников",
		"Количество учителей",
		"Кол-во учителей",
		6,
	);
	const siteIdx = headerIndex(
		header,
		"page_link",
		"Ссылка на сайт",
		"Сайт школы",
		7,
	);
	const latIdx = headerIndex(header, "latitude", "Широта", 8);
	const lonIdx = headerIndex(header, "longitude", "Долгота", 9);
	const addressIdx = headerIndex(header, "adress", "address", "Адрес", 10);
	const districtIdx = headerIndex(
		header,
		"district",
		"Район",
		"Район/Департамент",
		11,
	);
	const stateIdx = headerIndex(header, "is_state", "Государственная", 12);
	const religionalIdx = headerIndex(
		header,
		"is_religional",
		"Религиозная",
		13,
	);
	const buildingsIdx = headerIndex(
		header,
		"buildings",
		"Инфраструктура (количество зданий)",
		"Количество зданий",
		"Кол-во зданий",
		14,
	);
	const renovatedIdx = headerIndex(
		header,
		"renovated",
		"Отремонтирована",
		15,
	);
	const needsRepairsIdx = headerIndex(
		header,
		"needs_repairs",
		"Требует ремонта",
		16,
	);
	const criticalIdx = headerIndex(
		header,
		"critical_condition",
		"Аварийное состояние",
		17,
	);
	const secondShiftIdx = headerIndex(
		header,
		"second_shift(students)",
		"second_shift_students",
		"Обуч. во 2 смену",
		"Обучающихся во 2 смену",
		18,
	);
	const formIdx = headerIndex(header, "form", "Строится", 19);
	const shkonIdx = headerIndex(header, "SHKON", "shkon", "ШНОР", 20);
	const biasIdx = headerIndex(
		header,
		"A_school_with_bias",
		"a_school_with_bias",
		"Школа с необъективностью",
		21,
	);

	const schools: School[] = [];

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i]!;
		const name = toStr(cell(row, schoolIdx));
		const districtName = normalizeDistrictName(toStr(cell(row, districtIdx)));

		const lat = toFloat(cell(row, latIdx));
		const lon = toFloat(cell(row, lonIdx));
		const coords: [number, number] | null =
			lat !== null && lon !== null ? [lat, lon] : null;

		if (!districtName && coords === null) continue;

		schools.push({
			name: name ?? "",
			shift: toInt(cell(row, shiftIdx)),
			capacity: toInt(cell(row, capacityIdx)),
			students: toInt(cell(row, studentsIdx)),
			workers: toInt(cell(row, workersIdx)),
			teachers: toInt(cell(row, teachersIdx)),
			site: toStr(cell(row, siteIdx)),
			district: districtName,
			is_state: toBool(cell(row, stateIdx)),
			is_religional: toBool(cell(row, religionalIdx)),
			address: toStr(cell(row, addressIdx)),
			coords,
			buildings: buildingsCount(cell(row, buildingsIdx)),
			renovated: toBoolByPresence(cell(row, renovatedIdx)),
			needs_repairs: toBoolByPresence(cell(row, needsRepairsIdx)),
			critical_condition: toBool(cell(row, criticalIdx)),
			second_shift_students: toInt(cell(row, secondShiftIdx)),
			form: toBool(cell(row, formIdx)),
			shkon: toBool(cell(row, shkonIdx)),
			a_school_with_bias: toBool(cell(row, biasIdx)),
		});
	}

	const districtsMap = new Map<string, District>();

	for (const school of schools) {
		if (!school.district) continue;
		let d = districtsMap.get(school.district);
		if (!d) {
			d = {
				id: DISTRICT_ID_MAP[school.district] ?? null,
				name: school.district,
				students: 0,
				workers: 0,
				teachers: 0,
			};
			districtsMap.set(school.district, d);
		}
		d.students = (d.students ?? 0) + (school.students ?? 0);
		d.workers = (d.workers ?? 0) + (school.workers ?? 0);
		d.teachers = (d.teachers ?? 0) + (school.teachers ?? 0);
	}

	return buildPayload([...districtsMap.values()], schools);
}

export function parseExcelFile(file: File): Promise<ParsedData> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target!.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: "array" });
				const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
				const raw: Cell[][] = XLSX.utils.sheet_to_json(sheet, {
					header: 1,
					defval: null,
				});

				const rows = raw.filter((row) =>
					row.some((c) => c !== null && c !== undefined && c !== ""),
				);

				if (rows.length === 0) {
					resolve(buildPayload([], []));
					return;
				}

				const colCount = Math.max(...rows.map((r) => r.length));
				const isFlat = colCount >= 13;

				resolve(isFlat ? parseFlat(rows) : parseLegacy(rows));
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
		reader.readAsArrayBuffer(file);
	});
}
