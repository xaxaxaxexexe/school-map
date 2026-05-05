export const CHECHNYA_CENTER: [number, number] = [43.25, 45.7];
export const CHECHNYA_ZOOM = 9.45;

export interface DistrictGeo {
	id: number;
	shortName: string;
	center: [number, number];
	zoom: number;
	borderKeyword: string;
	color: string;
}

export const DISTRICT_GEO: Record<string, DistrictGeo> = {
	"Грозный (город)": {
		id: 1,
		shortName: "г. Грозный",
		center: [43.3169, 45.6981],
		zoom: 10,
		borderKeyword: "грозный",
		color: "#e74c3c",
	},
	"Аргун (город)": {
		id: 2,
		shortName: "г. Аргун",
		center: [43.2965, 45.8727],
		zoom: 10,
		borderKeyword: "аргун",
		color: "#3498db",
	},
	"Итум-Калинский р-н": {
		id: 3,
		shortName: "Итум-Калинский р-н",
		center: [42.73, 45.57],
		zoom: 10,
		borderKeyword: "итум",
		color: "#2ecc71",
	},
	"Веденский р-н": {
		id: 4,
		shortName: "Веденский р-н",
		center: [42.97, 46.1],
		zoom: 10,
		borderKeyword: "веден",
		color: "#9b59b6",
	},
	"Надтеречный р-н": {
		id: 5,
		shortName: "Надтеречный р-н",
		center: [43.65, 45.32],
		zoom: 10,
		borderKeyword: "надтеречн",
		color: "#f39c12",
	},
	"Серноводский р-н": {
		id: 6,
		shortName: "Серноводский р-н",
		center: [43.32, 45.38],
		zoom: 10,
		borderKeyword: "серновод",
		color: "#1abc9c",
	},
	"Шалинский р-н": {
		id: 7,
		shortName: "Шалинский р-н",
		center: [43.15, 45.88],
		zoom: 10,
		borderKeyword: "шалинск",
		color: "#e67e22",
	},
	"Шатойский р-н": {
		id: 8,
		shortName: "Шатойский р-н",
		center: [42.87, 45.68],
		zoom: 10,
		borderKeyword: "шатойск",
		color: "#2980b9",
	},
	"Шаройский р-н": {
		id: 9,
		shortName: "Шаройский р-н",
		center: [42.63, 45.86],
		zoom: 10,
		borderKeyword: "шаройск",
		color: "#8e44ad",
	},
	"Грозненский р-н": {
		id: 10,
		shortName: "Грозненский р-н",
		center: [43.4, 45.55],
		zoom: 10,
		borderKeyword: "грозненск",
		color: "#27ae60",
	},
	"Урус-Мартановский р-н": {
		id: 11,
		shortName: "Урус-Мартановский р-н",
		center: [43.13, 45.53],
		zoom: 10,
		borderKeyword: "урус",
		color: "#d35400",
	},
	"Гудермесский р-н": {
		id: 12,
		shortName: "Гудермесский р-н",
		center: [43.35, 46.1],
		zoom: 10,
		borderKeyword: "гудерм",
		color: "#c0392b",
	},
	"Наурский р-н": {
		id: 13,
		shortName: "Наурский р-н",
		center: [43.65, 45.83],
		zoom: 10,
		borderKeyword: "наурск",
		color: "#16a085",
	},
	"Курчалоевский р-н": {
		id: 15,
		shortName: "Курчалоевский р-н",
		center: [43.2, 46.09],
		zoom: 10,
		borderKeyword: "курчалоевск",
		color: "#6c5ce7",
	},
	"Ачхой-Мартановский р-н": {
		id: 19,
		shortName: "Ачхой-Мартановский р-н",
		center: [43.19, 45.28],
		zoom: 10,
		borderKeyword: "ачхой",
		color: "#ff7675",
	},
	"Ножай-Юртовский р-н": {
		id: 24,
		shortName: "Ножай-Юртовский р-н",
		center: [43.08, 46.38],
		zoom: 10,
		borderKeyword: "ножай",
		color: "#00b894",
	},
	"Шелковской р-н": {
		id: 25,
		shortName: "Шелковской р-н",
		center: [43.51, 46.35],
		zoom: 10,
		borderKeyword: "шелковск",
		color: "#fdcb6e",
	},
};

export const DISTRICT_ID_MAP: Record<string, number> = Object.fromEntries(
	Object.entries(DISTRICT_GEO).map(([name, geo]) => [name, geo.id]),
);

const DEFAULT_COLOR = "#3b82f6";
const MONITORING_RED = "#ef4444";
const MONITORING_YELLOW = "#f59e0b";
const MONITORING_GREEN = "#10b981";

export function getMonitoringScoreColor(
	score: number | null | undefined,
	median?: number | null,
): string {
	if (score == null) return DEFAULT_COLOR;
	if (score < 85) return MONITORING_RED;
	if (median != null && score >= median) return MONITORING_GREEN;
	return MONITORING_YELLOW;
}

export function computeMonitoringMedian(
	districts: { monitoring_score: number | null }[],
): number | null {
	const scores = districts
		.map((d) => d.monitoring_score)
		.filter((s): s is number => s != null)
		.sort((a, b) => a - b);
	if (scores.length === 0) return null;
	const mid = Math.floor(scores.length / 2);
	return scores.length % 2 === 0
		? (scores[mid - 1]! + scores[mid]!) / 2
		: scores[mid]!;
}

function findGeoByBorderName(borderName: string): DistrictGeo | null {
	const lower = borderName.toLowerCase();
	for (const geo of Object.values(DISTRICT_GEO)) {
		if (lower.includes(geo.borderKeyword)) return geo;
	}
	return null;
}

export function getDistrictColor(
	borderName: string,
	districts?: {
		id: number | null;
		name: string;
		monitoring_score?: number | null;
	}[],
	median?: number | null,
): string {
	const geo = findGeoByBorderName(borderName);
	if (!geo) return DEFAULT_COLOR;
	const district = districts?.find((d) => d.id === geo.id);
	return district
		? getMonitoringScoreColor(district.monitoring_score, median)
		: geo.color;
}

export function matchBorderToDistrictId(
	borderName: string,
	districts: { id: number | null; name: string }[],
): number | null {
	const lower = borderName.toLowerCase();

	for (const [deptName, geo] of Object.entries(DISTRICT_GEO)) {
		if (lower.includes(geo.borderKeyword)) {
			const district = districts.find((d) => d.name === deptName);
			if (district?.id != null) return district.id;
		}
	}

	return null;
}
