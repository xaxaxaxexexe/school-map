import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { District, School } from "@/types";
import { normalizeParsedData } from "@/lib/excelParser";

const STORAGE_KEY = "schools_data_cache";

interface DataState {
	districts: District[];
	schools: School[];
	loaded: boolean;
}

function loadFromStorage(): {
	districts: District[];
	schools: School[];
} | null {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		return normalizeParsedData(JSON.parse(raw));
	} catch {
		return null;
	}
}

function saveToStorage(districts: District[], schools: School[]) {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ districts, schools }));
	} catch {}
}

const cached = loadFromStorage();

const initialState: DataState = {
	districts: cached?.districts ?? [],
	schools: cached?.schools ?? [],
	loaded: cached !== null,
};

export const dataSlice = createSlice({
	name: "data",
	initialState,
	reducers: {
		setData(
			state,
			action: PayloadAction<{ districts: District[]; schools: School[] }>,
		) {
			state.districts = action.payload.districts;
			state.schools = action.payload.schools;
			state.loaded = true;
			saveToStorage(action.payload.districts, action.payload.schools);
		},
	},
});

export const { setData } = dataSlice.actions;
