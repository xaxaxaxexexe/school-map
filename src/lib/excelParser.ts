import * as XLSX from "xlsx";
import type {
	District,
	ExtraColumn,
	ExtraType,
	ExtraValue,
	School,
} from "@/types";
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

const NEGATIVE_TOKENS = new Set([
	"",
	"-",
	"—",
	"нет",
	"нет.",
	"не",
	"ytn",
	"no",
	"false",
	"ложь",
	"не отремонтирована",
	"не отремонтирован",
	"не отремонтировано",
	"не проводился",
	"не проводилась",
	"не проводилось",
	"не требуется",
	"не требует",
	"не требуются",
	"нет необходимости",
	"отсутствует",
	"0",
]);

const POSITIVE_TOKENS = new Set([
	"да",
	"да.",
	"yes",
	"true",
	"истина",
	"+",
	"есть",
	"имеется",
]);

function isNan(v: Cell): boolean {
	return v == null || (typeof v === "number" && Number.isNaN(v));
}

function toFloat(v: Cell): number | null {
	if (isNan(v)) return null;
	const n = Number(v);
	return Number.isFinite(n) ? n : null;
}

function toInt(v: Cell): number | null {
	const n = toFloat(v);
	return n != null ? Math.trunc(n) : null;
}

function toStr(v: Cell): string | null {
	if (isNan(v)) return null;
	const s = String(v).trim();
	return s || null;
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

function normalizeDepartmentDistrictName(v: string | null): string | null {
	if (!v) return null;
	const normalized = v
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/\s+/g, " ")
		.trim();

	if (normalized.includes("аргун")) return "Аргун (город)";
	if (normalized.includes("мэрии г.грозного")) return CANONICAL_GROZNY_DISTRICT;
	if (normalized.includes("мэрии г. грозного"))
		return CANONICAL_GROZNY_DISTRICT;
	if (normalized.includes("грозненск")) return "Грозненский р-н";
	if (normalized.includes("итум-калин")) return "Итум-Калинский р-н";
	if (normalized.includes("веден")) return "Веденский р-н";
	if (normalized.includes("надтереч")) return "Надтеречный р-н";
	if (normalized.includes("серновод")) return "Серноводский р-н";
	if (normalized.includes("шалин")) return "Шалинский р-н";
	if (normalized.includes("шатой")) return "Шатойский р-н";
	if (normalized.includes("шарой")) return "Шаройский р-н";
	if (normalized.includes("урус-мартан")) return "Урус-Мартановский р-н";
	if (normalized.includes("гудермес")) return "Гудермесский р-н";
	if (normalized.includes("наурск")) return "Наурский р-н";
	if (normalized.includes("ачхой")) return "Ачхой-Мартановский р-н";
	if (normalized.includes("курчалоев")) return "Курчалоевский р-н";
	if (normalized.includes("ножай-юртов")) return "Ножай-Юртовский р-н";
	if (normalized.includes("шелков")) return "Шелковской р-н";

	return normalizeDistrictName(v);
}

function normalizeHeader(v: Cell): string {
	const s = toStr(v);
	if (!s) return "";
	return s
		.toLowerCase()
		.replace(/ё/g, "е")
		.replace(/[^0-9a-zа-я]+/g, "_")
		.replace(/^_|_$/g, "");
}

function cleanLabel(v: Cell): string {
	const s = toStr(v);
	if (!s) return "";
	return s.replace(/\s+/g, " ").trim();
}

function isNumericString(s: string): boolean {
	return /^-?[\d\s]+([.,]\d+)?%?$/.test(s.trim());
}

function classifyExtra(
	values: Cell[],
	hasPercentFormat: boolean,
): ExtraType | null {
	const non = values.filter((v) => v != null && v !== "");
	if (non.length === 0) return null;
	let allNumeric = true;
	let hasPercentSign = false;
	const numbers: number[] = [];
	for (const v of non) {
		if (typeof v === "number") {
			numbers.push(v);
			continue;
		}
		if (typeof v === "boolean") {
			allNumeric = false;
			continue;
		}
		const s = String(v).trim().toLowerCase();
		if (NEGATIVE_TOKENS.has(s) || POSITIVE_TOKENS.has(s)) {
			allNumeric = false;
			continue;
		}
		if (s.includes("%")) hasPercentSign = true;
		if (isNumericString(s)) {
			const n = parseFloat(
				s.replace(/\s/g, "").replace(",", ".").replace("%", ""),
			);
			if (Number.isFinite(n)) {
				numbers.push(n);
				continue;
			}
		}
		allNumeric = false;
	}
	if (!allNumeric) return "boolean";
	if (numbers.length === 0) return null;
	if (hasPercentFormat || hasPercentSign) return "percent";
	if (numbers.every((n) => n >= 0 && n <= 1)) {
		if (numbers.some((n) => n !== Math.floor(n))) return "percent";
		return "boolean";
	}
	return "numeric";
}

function parseExtraValue(v: Cell, type: ExtraType): ExtraValue {
	if (v == null || v === "") return null;
	if (type === "boolean") {
		if (typeof v === "boolean") return v;
		if (typeof v === "number") return v !== 0;
		const s = String(v).trim().toLowerCase();
		if (NEGATIVE_TOKENS.has(s)) return false;
		return true;
	}
	if (typeof v === "number") return v;
	if (typeof v === "boolean") return v ? 1 : 0;
	const s = String(v).trim().replace(/\s/g, "").replace(",", ".").replace("%", "");
	const n = parseFloat(s);
	return Number.isFinite(n) ? n : null;
}

const REQUIRED_ALIASES: Record<string, string[]> = {
	name: ["Название школы", "Название", "school_name"],
	shift: ["Сменность", "Смена", "shift_count"],
	capacity: ["Мощность", "power"],
	students: [
		"Количество обучающихся",
		"Кол-во учащихся",
		"student_count",
	],
	workers: [
		"Количество работников",
		"Кол-во работников",
		"employee_count",
	],
	teachers: [
		"Количество педработников",
		"Количество учителей",
		"Кол-во учителей",
		"edu_employee_count",
	],
	site: ["Ссылка на сайт", "Сайт школы", "page_link"],
	lat: ["Широта", "latitude"],
	lon: ["Долгота", "longitude"],
	address: ["Адрес", "address", "adress"],
	district: ["Район", "Район/Департамент", "district"],
	monitoring_score: [
		"Итоговый балл в мотивирующем мониторинге за 2024 г.",
		"Итоговый балл в мотивирующем мониторинге",
	],
	institution_type: ["Тип учреждения", "institution_type"],
};

const ID_ALIASES = ["ID", "Порядковый номер"];

function buildAliasMap(): Map<string, string> {
	const map = new Map<string, string>();
	for (const [field, aliases] of Object.entries(REQUIRED_ALIASES)) {
		for (const alias of aliases) {
			map.set(normalizeHeader(alias), field);
		}
	}
	return map;
}

const ID_NORMALIZED = new Set(ID_ALIASES.map((a) => normalizeHeader(a)));

interface RequiredFields {
	name: number | null;
	shift: number | null;
	capacity: number | null;
	students: number | null;
	workers: number | null;
	teachers: number | null;
	site: number | null;
	lat: number | null;
	lon: number | null;
	address: number | null;
	district: number | null;
	monitoring_score: number | null;
	institution_type: number | null;
}

function indexHeaders(header: Cell[]): {
	required: RequiredFields;
	extras: { idx: number; key: string; label: string }[];
} {
	const aliasMap = buildAliasMap();
	const required: RequiredFields = {
		name: null,
		shift: null,
		capacity: null,
		students: null,
		workers: null,
		teachers: null,
		site: null,
		lat: null,
		lon: null,
		address: null,
		district: null,
		monitoring_score: null,
		institution_type: null,
	};
	const extras: { idx: number; key: string; label: string }[] = [];
	const seenExtraKeys = new Set<string>();

	for (let i = 0; i < header.length; i++) {
		const norm = normalizeHeader(header[i]);
		if (!norm) continue;
		if (ID_NORMALIZED.has(norm)) continue;
		const field = aliasMap.get(norm);
		if (field) {
			const f = field as keyof RequiredFields;
			if (required[f] === null) required[f] = i;
			continue;
		}
		const label = cleanLabel(header[i]);
		if (!label) continue;
		let key = norm;
		let n = 1;
		while (seenExtraKeys.has(key)) {
			n += 1;
			key = `${norm}_${n}`;
		}
		seenExtraKeys.add(key);
		extras.push({ idx: i, key, label });
	}

	return { required, extras };
}

function cell(row: Cell[], idx: number | null): Cell {
	if (idx === null) return null;
	return idx < row.length ? row[idx] : null;
}

export interface ParsedData {
	districts: District[];
	schools: School[];
	extraColumns: ExtraColumn[];
	institutionTypes: string[];
}

interface DistrictRowAccum {
	name: string;
	monitoring_score: number | null;
	students: number | null;
	workers: number | null;
	teachers: number | null;
	extras: Record<string, ExtraValue>;
}

function parseFlat(
	rows: Cell[][],
	percentFormatCols: Set<number>,
): ParsedData {
	const header = rows[0]!;
	const { required, extras: extraDefs } = indexHeaders(header);

	// Pass 1: classify rows + collect raw extra cells from school rows
	type ClassifiedRow =
		| {
				kind: "school";
				row: Cell[];
				districtName: string | null;
				institutionType: string | null;
		  }
		| {
				kind: "district";
				row: Cell[];
				districtName: string;
		  };

	const classified: ClassifiedRow[] = [];

	for (let i = 1; i < rows.length; i++) {
		const row = rows[i]!;
		const name = toStr(cell(row, required.name));
		const site = toStr(cell(row, required.site));
		const lat = toFloat(cell(row, required.lat));
		const lon = toFloat(cell(row, required.lon));
		const districtRaw = toStr(cell(row, required.district));
		const districtName = normalizeDistrictName(districtRaw);
		const institutionType = toStr(cell(row, required.institution_type));

		const isSchool = !!site || (lat != null && lon != null);
		if (isSchool) {
			classified.push({
				kind: "school",
				row,
				districtName,
				institutionType,
			});
			continue;
		}

		const candidate = normalizeDepartmentDistrictName(name);
		if (candidate && candidate in DISTRICT_ID_MAP) {
			classified.push({ kind: "district", row, districtName: candidate });
			continue;
		}
	}

	// Pass 2: classify each extra column based on values across all classified rows
	const extraCols: ExtraColumn[] = [];
	for (const def of extraDefs) {
		const values: Cell[] = classified.map((c) => cell(c.row, def.idx));
		const type = classifyExtra(values, percentFormatCols.has(def.idx));
		if (type === null) continue;
		extraCols.push({ key: def.key, label: def.label, type });
	}
	const extraColMap = new Map(extraCols.map((c) => [c.key, c]));
	const extraIdxByKey = new Map(extraDefs.map((d) => [d.key, d.idx]));

	// Pass 3: build School + DistrictRowAccum collections
	const schools: School[] = [];
	const districtRowAcc = new Map<string, DistrictRowAccum>();
	const institutionTypes = new Set<string>();

	for (const c of classified) {
		if (c.kind === "school") {
			const row = c.row;
			const name = toStr(cell(row, required.name)) ?? "";
			const lat = toFloat(cell(row, required.lat));
			const lon = toFloat(cell(row, required.lon));
			const coords: [number, number] | null =
				lat != null && lon != null ? [lat, lon] : null;

			const schoolExtras: Record<string, ExtraValue> = {};
			for (const col of extraCols) {
				const idx = extraIdxByKey.get(col.key);
				if (idx == null) continue;
				schoolExtras[col.key] = parseExtraValue(cell(row, idx), col.type);
			}

			if (c.institutionType) institutionTypes.add(c.institutionType);

			schools.push({
				name,
				shift: toInt(cell(row, required.shift)),
				capacity: toInt(cell(row, required.capacity)),
				students: toInt(cell(row, required.students)),
				workers: toInt(cell(row, required.workers)),
				teachers: toInt(cell(row, required.teachers)),
				site: toStr(cell(row, required.site)),
				district: c.districtName,
				address: toStr(cell(row, required.address)),
				coords,
				monitoring_score: toFloat(cell(row, required.monitoring_score)),
				institution_type: c.institutionType,
				extras: schoolExtras,
			});
		} else {
			const row = c.row;
			let acc = districtRowAcc.get(c.districtName);
			if (!acc) {
				acc = {
					name: c.districtName,
					monitoring_score: null,
					students: null,
					workers: null,
					teachers: null,
					extras: {},
				};
				districtRowAcc.set(c.districtName, acc);
			}
			const ms = toFloat(cell(row, required.monitoring_score));
			if (ms != null) acc.monitoring_score = ms;
			const st = toInt(cell(row, required.students));
			if (st != null) acc.students = st;
			const wk = toInt(cell(row, required.workers));
			if (wk != null) acc.workers = wk;
			const tc = toInt(cell(row, required.teachers));
			if (tc != null) acc.teachers = tc;
			for (const col of extraCols) {
				const idx = extraIdxByKey.get(col.key);
				if (idx == null) continue;
				const val = parseExtraValue(cell(row, idx), col.type);
				if (val != null && acc.extras[col.key] == null) {
					acc.extras[col.key] = val;
				}
			}
		}
	}

	// Build districts: ensure all known DISTRICT_ID_MAP entries exist
	const districts: District[] = [];
	const seenDistrictNames = new Set<string>();
	for (const [name, id] of Object.entries(DISTRICT_ID_MAP)) {
		const acc = districtRowAcc.get(name);
		// Aggregate counts from schools as a baseline (kept for compatibility, but actual aggregation lives in useDashboardData)
		const schoolList = schools.filter((s) => s.district === name);
		const studentsFromSchools = schoolList.reduce(
			(s, x) => s + (x.students ?? 0),
			0,
		);
		const workersFromSchools = schoolList.reduce(
			(s, x) => s + (x.workers ?? 0),
			0,
		);
		const teachersFromSchools = schoolList.reduce(
			(s, x) => s + (x.teachers ?? 0),
			0,
		);
		const monitoringFromSchools = schoolList.find(
			(s) => s.monitoring_score != null,
		)?.monitoring_score;

		districts.push({
			id,
			name,
			students:
				schoolList.length > 0 ? studentsFromSchools : (acc?.students ?? null),
			workers:
				schoolList.length > 0 ? workersFromSchools : (acc?.workers ?? null),
			teachers:
				schoolList.length > 0 ? teachersFromSchools : (acc?.teachers ?? null),
			monitoring_score:
				monitoringFromSchools ?? acc?.monitoring_score ?? null,
			district_row_extras: acc?.extras ?? {},
		});
		seenDistrictNames.add(name);
	}

	// Sort by id ascending (null ids last); keep stable order
	districts.sort(
		(a, b) =>
			(a.id === null ? 1 : 0) - (b.id === null ? 1 : 0) ||
			(a.id ?? 0) - (b.id ?? 0),
	);

	const sortedInstitutionTypes = [...institutionTypes].sort((a, b) =>
		a.localeCompare(b, "ru"),
	);

	// Reference extraColMap to keep it accessible for fallback handling later
	void extraColMap;

	return {
		districts,
		schools,
		extraColumns: extraCols,
		institutionTypes: sortedInstitutionTypes,
	};
}

export function normalizeParsedData(data: ParsedData): ParsedData {
	const schools = data.schools.map((school) => ({
		...school,
		district: normalizeDistrictName(school.district),
		extras: school.extras ?? {},
	}));
	const districts = data.districts.map((district) => ({
		...district,
		name: normalizeDistrictName(district.name) ?? district.name,
		monitoring_score: district.monitoring_score ?? null,
		district_row_extras: district.district_row_extras ?? {},
	}));

	return {
		districts,
		schools,
		extraColumns: data.extraColumns ?? [],
		institutionTypes: data.institutionTypes ?? [],
	};
}

function collectPercentFormatColumns(
	sheet: XLSX.WorkSheet,
): Set<number> {
	const cols = new Set<number>();
	const ref = sheet["!ref"];
	if (!ref) return cols;
	const range = XLSX.utils.decode_range(ref);
	for (let C = range.s.c; C <= range.e.c; C++) {
		for (let R = range.s.r; R <= range.e.r; R++) {
			const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })] as
				| { z?: string }
				| undefined;
			if (cell?.z && String(cell.z).includes("%")) {
				cols.add(C);
				break;
			}
		}
	}
	return cols;
}

export function parseExcelFile(file: File): Promise<ParsedData> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const data = new Uint8Array(e.target!.result as ArrayBuffer);
				const workbook = XLSX.read(data, { type: "array", cellNF: true });
				const sheet = workbook.Sheets[workbook.SheetNames[0]!]!;
				const percentFormatCols = collectPercentFormatColumns(sheet);
				const raw: Cell[][] = XLSX.utils.sheet_to_json(sheet, {
					header: 1,
					defval: null,
				});

				const rows = raw.filter((row) =>
					row.some((c) => c !== null && c !== undefined && c !== ""),
				);

				if (rows.length === 0) {
					resolve({
						districts: [],
						schools: [],
						extraColumns: [],
						institutionTypes: [],
					});
					return;
				}

				resolve(parseFlat(rows, percentFormatCols));
			} catch (err) {
				reject(err);
			}
		};
		reader.onerror = () => reject(new Error("Не удалось прочитать файл"));
		reader.readAsArrayBuffer(file);
	});
}
