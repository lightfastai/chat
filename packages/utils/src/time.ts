/**
 * Time-related utility functions
 */

export type DateGroup =
	| "Today"
	| "Yesterday"
	| "This Week"
	| "This Month"
	| "Older";

export interface GroupedByDate<T> {
	Today: T[];
	Yesterday: T[];
	"This Week": T[];
	"This Month": T[];
	Older: T[];
}

/**
 * Groups items by date categories based on a date extractor function
 * @param items - Array of items to group
 * @param dateExtractor - Function to extract date from each item
 * @returns Object with items grouped by date categories
 */
export function groupByDate<T>(
	items: T[],
	dateExtractor: (item: T) => Date | number,
): GroupedByDate<T> {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	const groups: GroupedByDate<T> = {
		Today: [],
		Yesterday: [],
		"This Week": [],
		"This Month": [],
		Older: [],
	};

	for (const item of items) {
		const dateValue = dateExtractor(item);
		const itemDate =
			typeof dateValue === "number" ? new Date(dateValue) : dateValue;

		if (itemDate >= today) {
			groups.Today.push(item);
		} else if (itemDate >= yesterday) {
			groups.Yesterday.push(item);
		} else if (itemDate >= weekAgo) {
			groups["This Week"].push(item);
		} else if (itemDate >= monthAgo) {
			groups["This Month"].push(item);
		} else {
			groups.Older.push(item);
		}
	}

	return groups;
}

/**
 * Returns an array of date group keys in chronological order
 */
export function getDateGroupOrder(): DateGroup[] {
	return ["Today", "Yesterday", "This Week", "This Month", "Older"];
}

/**
 * Formats a date relative to the current time
 * @param date - Date to format
 * @returns Formatted string like "Today", "Yesterday", "This Week", etc.
 */
export function getRelativeDateGroup(date: Date | number): DateGroup {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
	const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
	const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

	const itemDate = typeof date === "number" ? new Date(date) : date;

	if (itemDate >= today) {
		return "Today";
	}
	if (itemDate >= yesterday) {
		return "Yesterday";
	}
	if (itemDate >= weekAgo) {
		return "This Week";
	}
	if (itemDate >= monthAgo) {
		return "This Month";
	}
	return "Older";
}
