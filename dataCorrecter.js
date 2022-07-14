const corrections = [
	{ old: "Fiji Islands", new: "Fiji" },
	{ old: "Western Sahara", new: "W. Sahara" },
	{ old: "United States", new: "United States of America" },
	{ old: "The Democratic Republic of the Congo", new: "Dem. Rep. Congo" },
	{ old: "Dominican Republic", new: "Dominican Rep." },
	{ old: "Bosnia and Herzegovina", new: "Bosnia and Herz." },
	{ old: "Russian Federation", new: "Russia" },
	{ old: "North Macedonia", new: "Macedonia" },
	{ old: "Czech Republic", new: "Czechia" },
	{ old: "Libyan Arab Jamahiriya", new: "Libya" },
];

export function dataCorrecter(data) {
	return data.map(replaceCountryName);
}

function replaceCountryName(row) {
	const correction = corrections.find(
		(correction) => correction.old === row.country
	);
	return correction
		? {
				...row,
				country: correction.new,
		  }
		: row;
}
