import { options } from "./options.js";

const SIZE_FILE =
	"./node_modules/country-json/src/country-by-surface-area.json";
const MAP_FILE = "/countries-110m.json";

Promise.all([d3.json(SIZE_FILE), d3.json(MAP_FILE)])
	.then((data) => Choropleth(data[0], data[1], options))
	.catch((err) => console.error(err.message, err.lineNumber, err.fileName));

function Choropleth(
	data,
	map,
	{
		title = "Default title",
		description = "Default description",
		chartId = "Default chart ID",
		targetId = "visHolder",
		dimensions = {
			width: 100,
			height: 100,
		},
		padding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		},
		dataAccessor = (d) => d,
		idAccessor = (d) => d,
		groups = 5,
		legendDimensions = {
			width: 100,
			height: 100,
		},
		legendPadding = {
			top: 0,
			right: 0,
			bottom: 0,
			left: 0,
		},
		legendPosition = {
			x: 0,
			y: 0,
		},
	}
) {
	//compute dimensions
	function getTotalDimensions(dimensions, padding) {
		return [
			dimensions.width + padding.left + padding.right,
			dimensions.height + padding.top + padding.bottom,
		];
	}

	const [totalWidth, totalHeight] = getTotalDimensions(dimensions, padding);
	const [totalLegendWidth, totalLegendHeight] = getTotalDimensions(
		legendDimensions,
		legendPadding
	);

	//create svg
	const svg = d3
		.select(`#${targetId}`)
		.append("svg")
		.attr("id", chartId)
		.attr("width", totalWidth)
		.attr("height", totalHeight)
		.attr("viewBox", [0, 0, totalWidth, totalHeight])
		.attr("style", "width: 100%; height: auto; height: intrinsic;");

	//create title
	const titleElement = svg
		.append("text")
		.attr("id", "title")
		.text(title)
		.attr("y", 20)
		.attr("x", 10);
	//create description
	const descriptionElement = svg
		.append("text")
		.attr("id", "description")
		.text(description)
		.attr("y", 50)
		.attr("x", 20);

	//create scale
	const colorScale = d3
		.scaleQuantile()
		.domain(d3.extent(data, dataAccessor))
		.range(d3.schemeGreens[groups]);

	//create legend data
	const legendData = [d3.min(data, dataAccessor), ...colorScale.quantiles()];

	//create legend area
	const legend = svg
		.append("svg")
		.attr("id", "legend")
		.attr("transform", `translate(${legendPosition.x}, ${legendPosition.y})`)
		.attr("height", totalLegendHeight)
		.attr("width", totalLegendWidth);

	//compute legend rectangles dimensions and position
	const legendRectWidth = legendDimensions.width / legendData.length;
	const legendRectHeight = legendDimensions.height - 10;
	const legendRectX = (_d, i) => legendPadding.left + legendRectWidth * i;
	const legendRectY = legendPadding.top;

	//create legend rectangles
	const legendRects = legend
		.selectAll("rect")
		.data(legendData)
		.join("rect")
		.attr("fill", colorScale)
		.attr("width", legendRectWidth)
		.attr("height", legendRectHeight)
		.attr("x", legendRectX)
		.attr("y", legendRectY);

	//create legend scale
	const tickValues = [...legendData, d3.max(data, dataAccessor)];
	const tickFormat = (x) => Math.round(x) + "%";
	const tickSize = legendRectHeight;
	const legendScale = d3
		.scaleLinear()
		.domain(d3.extent(tickValues))
		.range([legendPadding.left, legendDimensions.width + legendPadding.left]);

	const legendAxis = d3
		.axisBottom(legendScale)
		.tickValues(tickValues)
		.tickFormat(tickFormat)
		.tickSizeInner(tickSize)
		.tickSizeOuter(0);

	const removeUpperLine = (g) => g.select(".domain").remove();

	legend
		.append("g")
		.attr("transform", `translate(0,${legendPadding.top})`)
		.call(legendAxis)
		.call(removeUpperLine);

	const path = d3.geoPath();

	const tooltip = d3
		.select("#visHolder")
		.append("div")
		.style("opacity", 0)
		.attr("id", "tooltip")
		.style("font-size", "16px");

	function countyMouseover(_e, d) {
		const county = getCountyById(data, "fips", d);
		tooltip
			.html(`${county.area_name}: ${county.bachelorsOrHigher}%`)
			.style("opacity", 1)
			.attr("data-education", d3.select(this).attr("data-education"));
		d3.select(this).style("stroke-width", 1);
		console.log(tooltip.style("left"));
	}
	function countyMousemove(e) {
		tooltip
			.style("left", d3.pointer(e)[0] + "px")
			.style("top", d3.pointer(e)[1] + 70 + "px");
	}
	function countyMouseleave() {
		tooltip.style("opacity", 0);
		d3.select(this).style("stroke-width", 0.1);
	}
	const mapArea = svg
		.append("g")
		.attr("id", "chartArea")
		.attr("width", dimensions.width)
		.attr("height", dimensions.height)
		.attr("transform", `translate(${padding.left}, ${padding.top})`);

	function getCountyById(counties, id, requestedId) {
		return counties.find((county) => county[id] === idAccessor(requestedId));
	}
	const countiesArray = map.objects.counties;
	const countiesFeature = topojson.feature(map, countiesArray).features;
	const counties = mapArea
		.append("g")
		.selectAll("path")
		.data(countiesFeature)
		.join("path")
		.attr("class", "county")
		.attr("d", path)
		.attr("stroke", "black")
		.attr("stroke-width", 0.1)
		.attr("fill", (d) =>
			colorScale(dataAccessor(getCountyById(data, "fips", d)))
		)
		.attr("data-fips", idAccessor)
		.attr("data-education", (d) => dataAccessor(getCountyById(data, "fips", d)))
		.on("mouseover", countyMouseover)
		.on("mousemove", countyMousemove)
		.on("mouseleave", countyMouseleave);

	const stateMesh = topojson.mesh(map, map.objects.states, (a, b) => a !== b);
	const stateBorders = mapArea
		.append("path")
		.attr("pointer-events", "none")
		.attr("fill", "none")
		.attr("stroke", "grey")
		.attr("stroke-width", 0.5)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("d", path(stateMesh));
}
