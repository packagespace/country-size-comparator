export const options = {
	title: "Country Size Comparator",
	description: "Click on a country",
	chartId: "WorldMap",
	targetId: "visHolder",
	dimensions: {
		width: 1250,
		height: 500,
	},
	padding: {
		top: 100,
		right: 50,
		bottom: 150,
		left: 50,
	},
	dataAccessor: (d) => d.bachelorsOrHigher,
	idAccessor: (d) => d.id,
	groups: 9,
	legendDimensions: {
		width: 250,
		height: 20,
	},
	legendPadding: {
		top: 10,
		right: 15,
		bottom: 10,
		left: 15,
	},
	legendPosition: {
		x: 1000,
		y: 500,
	},
};
