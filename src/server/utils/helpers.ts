// Helper function to stringify objects for display in templates
export function stringify(obj: any): string {
	// if string, return it
	if (typeof obj === "string") {
		return obj;
	}

	if (Array.isArray(obj)) {
		return `<ul>${obj.map(item => {
			return `<li>${stringify(item)}</li>`;
		}).join("")}</ul>`;
	} else {
		if (typeof obj === "object") {
			return `<ul>${Object.keys(obj).map(key => {
				return `<li>${key}: ${stringify(obj[key])}</li>`;
			}).join("")}</ul>`;
		} else {
			return String(obj);
		}
	}
}

// Helper function to format file size
export function prettySize(bytes: number): string {
	const units = ["B", "KB", "MB", "GB", "TB"];
	let i = 0;
	while (bytes >= 1024 && i < units.length - 1) {
		bytes /= 1024;
		i++;
	}
	return `${bytes.toFixed(2)} ${units[i]}`;
}