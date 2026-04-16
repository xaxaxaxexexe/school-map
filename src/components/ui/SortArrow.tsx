export function SortArrow({
	active,
	dir,
}: {
	active: boolean;
	dir: "asc" | "desc";
}) {
	return (
		<svg
			className={`ml-1 inline h-3 w-3 transition ${active ? "opacity-100" : "opacity-30"}`}
			viewBox="0 0 10 12"
			fill="currentColor"
		>
			{dir === "asc" || !active ? (
				<path d="M5 0L10 6H0z" />
			) : (
				<path d="M5 12L0 6h10z" />
			)}
		</svg>
	);
}
