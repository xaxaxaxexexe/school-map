import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { parseExcelFile } from "@/lib/excelParser";
import { setData } from "@/store/dataSlice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export function AdminDashboardPage() {
	const fileRef = useRef<HTMLInputElement>(null);
	const dispatch = useAppDispatch();
	const { loaded } = useAppSelector((s) => s.data);

	const [dragging, setDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadResult, setUploadResult] = useState<{
		ok: boolean;
		message: string;
	} | null>(null);

	async function doUpload(file: File) {
		if (!file.name.toLowerCase().endsWith(".xlsx")) {
			setUploadResult({
				ok: false,
				message: "Только .xlsx файлы",
			});
			return;
		}

		setUploadResult(null);
		setUploading(true);

		try {
			const result = await parseExcelFile(file);
			dispatch(setData(result));
			setUploadResult({
				ok: true,
				message: `Загружено: ${result.districts.length} районов, ${result.schools.length} школ`,
			});
		} catch {
			setUploadResult({
				ok: false,
				message: "Не удалось обработать файл. Проверьте формат (.xlsx)",
			});
		} finally {
			setUploading(false);
		}

		if (fileRef.current) fileRef.current.value = "";
	}

	function handleFileInput(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (file) doUpload(file);
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		setDragging(true);
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		setDragging(false);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		setDragging(false);
		const file = e.dataTransfer.files[0];
		if (file) doUpload(file);
	}

	return (
		<div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
			<div className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
				<div className="mb-4 flex flex-wrap items-center gap-2">
					<Link
						to="/"
						className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm dark:shadow-neutral-900/30 transition hover:bg-neutral-50 dark:hover:bg-neutral-700 active:scale-95 sm:px-4 sm:py-2 sm:text-sm"
					>
						Главная
					</Link>
					<Link
						to="/map"
						className="hidden items-center gap-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm dark:shadow-neutral-900/30 transition hover:bg-neutral-50 dark:hover:bg-neutral-700 active:scale-95 sm:inline-flex"
					>
						Карта школ
					</Link>
					<ThemeToggle />
				</div>
				<h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 sm:text-2xl">
					Загрузка данных
				</h1>

				<section className="mt-6 rounded-2xl bg-white dark:bg-neutral-800 p-4 shadow-lg dark:shadow-neutral-900/40 sm:mt-8 sm:p-6">
					<h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
						Данные (Excel)
					</h2>

					<p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
						Статус:{" "}
						{loaded ? (
							<span className="font-medium text-green-600">
								данные загружены
							</span>
						) : (
							<span className="font-medium text-amber-600">
								данные отсутствуют
							</span>
						)}
					</p>

					<label
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-5 transition sm:p-8 ${
							dragging
								? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
								: "border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20"
						}`}
					>
						<div className="text-3xl text-neutral-300 dark:text-neutral-600">
							{uploading ? (
								<div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 dark:border-neutral-600 border-t-blue-600" />
							) : (
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									strokeWidth="1.5"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
									<polyline points="17 8 12 3 7 8" />
									<line x1="12" y1="3" x2="12" y2="15" />
								</svg>
							)}
						</div>
						<p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">
							{uploading ? "Обработка..." : "Перетащите .xlsx сюда или нажмите"}
						</p>
						<p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
							Файл обрабатывается прямо в браузере — сервер не нужен
						</p>
						<input
							ref={fileRef}
							type="file"
							accept=".xlsx"
							onChange={handleFileInput}
							className="hidden"
							disabled={uploading}
						/>
					</label>

					{uploadResult && (
						<p
							className={`mt-4 text-sm font-medium ${uploadResult.ok ? "text-green-600" : "text-red-500"}`}
						>
							{uploadResult.message}
						</p>
					)}
				</section>

				<section className="mt-4 rounded-2xl bg-white dark:bg-neutral-800 p-4 shadow-lg dark:shadow-neutral-900/40 sm:mt-6 sm:p-6">
					<h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 sm:text-lg">
						Инструкция по заполнению Excel
					</h2>

					<p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
						Файл должен быть в формате <strong>.xlsx</strong>. Первая строка —
						заголовки столбцов (произвольные, парсер ориентируется по порядку
						колонок). Данные начинаются со второй строки.
					</p>

					<div className="mt-5">
						<h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
							Основной формат (30 колонок, A–AD)
						</h3>
						<p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
							Парсер ориентируется на названия столбцов из заголовка (регистр и
							пунктуация неважны), поэтому порядок может слегка меняться. Ниже —
							канонический порядок из новой базы.
						</p>
						<div className="mt-2 overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
							<table className="w-full text-left text-xs">
								<thead className="bg-neutral-50 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
									<tr>
										<th className="whitespace-nowrap px-3 py-2 font-medium">
											№
										</th>
										<th className="whitespace-nowrap px-3 py-2 font-medium">
											Колонка
										</th>
										<th className="whitespace-nowrap px-3 py-2 font-medium">
											Тип
										</th>
										<th className="whitespace-nowrap px-3 py-2 font-medium">
											Пример
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-neutral-100 dark:divide-neutral-700 text-neutral-700 dark:text-neutral-300">
									{[
										["A", "Порядковый номер", "Число", "1"],
										["B", "Название школы", "Текст", "СОШ №1 г. Грозный"],
										["C", "Сменность", "Число", "2"],
										["D", "Мощность", "Число", "500"],
										["E", "Количество обучающихся", "Число", "430"],
										["F", "1–4 классы", "Число", "180"],
										["G", "5–8 классы", "Число", "190"],
										["H", "9 класс", "Число", "40"],
										["I", "10 класс", "Число", "12"],
										["J", "11 класс", "Число", "8"],
										[
											"K",
											"Доля выпускников ЕГЭ (хим/физ/био + проф. матем. + ИКТ)",
											"Доля 0–1",
											"0.317",
										],
										["L", "Количество работников", "Число", "60"],
										[
											"M",
											"Численность обучающихся на 1 работника",
											"Число",
											"6.13",
										],
										["N", "Количество АУП", "Число", "4"],
										["O", "Доля АУП", "Доля 0–1", "0.045"],
										["P", "Количество педработников", "Число", "35"],
										["Q", "Количество иных работников", "Число", "21"],
										["R", "Доля иных работников", "Доля 0–1", "0.27"],
										["S", "Ссылка на сайт", "Текст/URL", "school1.edu"],
										["T", "Широта", "Число", "43.3175"],
										["U", "Долгота", "Число", "45.6940"],
										["V", "Адрес", "Текст", "ул. Ленина, 1"],
										["W", "Район", "Текст", "Грозный (город)"],
										[
											"X",
											"Инфраструктура (количество зданий)",
											"Число, пусто = 1",
											"3",
										],
										[
											"Y",
											"Проведен капитальный ремонт",
											"Год/текст или Нет",
											"2021",
										],
										[
											"Z",
											"Требуется кап. ремонт",
											"Год/текст или Нет",
											"требует",
										],
										["AA", "В аварийном состоянии", "Да/Нет", "Нет"],
										["AB", "ШНОР", "Да/Нет", "Да"],
										["AC", "Школа с необъективностью", "Да/Нет", "Нет"],
										[
											"AD",
											"Итоговый балл в мотивирующем мониторинге (только для строк-районов)",
											"Число",
											"86.4",
										],
									].map(([col, name, type, example]) => (
										<tr key={col}>
											<td className="whitespace-nowrap px-3 py-1.5 font-mono text-neutral-400 dark:text-neutral-500">
												{col}
											</td>
											<td className="whitespace-nowrap px-3 py-1.5 font-medium">
												{name}
											</td>
											<td className="whitespace-nowrap px-3 py-1.5 text-neutral-500 dark:text-neutral-400">
												{type}
											</td>
											<td className="whitespace-nowrap px-3 py-1.5 text-neutral-400 dark:text-neutral-500">
												{example}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>

					<div className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
						<h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
							Когда строка загружается
						</h3>
						<p>
							Строка попадает в систему, если заполнено{" "}
							<strong>хотя бы одно</strong> из двух полей:{" "}
							<strong>район</strong> (W) или <strong>координаты</strong> (T +
							U). Если оба поля пустые — строка пропускается. Все остальные поля
							необязательны и могут быть пустыми.
						</p>
					</div>

					<div className="mt-5 space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
						<h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
							Правила заполнения
						</h3>
						<ul className="list-inside list-disc space-y-1.5 pl-1">
							<li>
								Колонка <strong>«Район»</strong> (W) должна точно совпадать с
								одним из известных названий районов (например,{" "}
								<code className="rounded bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 text-xs">
									Грозный (город)
								</code>
								). Районы создаются автоматически на основе этого поля.
							</li>
							<li>
								<strong>Координаты</strong> (T, U) — десятичные числа (например,{" "}
								<code className="rounded bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 text-xs">
									43.3175
								</code>
								). Нужны обе колонки для отображения школы на карте. Если
								координат нет — школа появится в списке, но не на карте.
							</li>
							<li>
								Поля типа <strong>Да/Нет</strong> (Y–AC) принимают:{" "}
								<code className="rounded bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 text-xs">
									Да
								</code>
								,{" "}
								<code className="rounded bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 text-xs">
									Нет
								</code>{" "}
								(или пусто = Нет). Для столбцов «Проведен капитальный ремонт»
								(Y) и «Требуется кап. ремонт» (Z) можно вписать год или
								пояснение — любое непустое значение, кроме «Нет», считается
								положительным.
							</li>
							<li>
								Поля-доли (K, O, R) — десятичные числа от 0 до 1 (например,{" "}
								<code className="rounded bg-neutral-100 dark:bg-neutral-700 px-1 py-0.5 text-xs">
									0.317
								</code>
								), отображаются как проценты.
							</li>
							<li>Пустые числовые поля (C–R, X) отобразятся как «—».</li>
							<li>
								Название школы (B) может быть пустым — строка всё равно
								загрузится, если указан район или координаты.
							</li>
							<li>
								<strong>«Итоговый балл в мотивирующем мониторинге»</strong> (AD)
								заполняется только в строках-районах (без сайта школы) — он
								влияет на цвет района: красный {"<"} 85, жёлтый 85–86.1, зелёный{" "}
								{">"} 86.1.
							</li>
							<li>
								Статистика по районам (учащиеся, работники, педработники)
								рассчитывается <strong>автоматически</strong> как сумма по
								школам.
							</li>
						</ul>
					</div>
				</section>
			</div>
		</div>
	);
}
