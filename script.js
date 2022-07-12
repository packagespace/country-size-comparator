import { options } from "./options.js";
import { dataCorrecter } from "./dataCorrecter.js";

const SIZE_FILE =
	"https://raw.githubusercontent.com/samayo/country-json/master/src/country-by-surface-area.json";
const MAP_FILE =
	"https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

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
	let selectedCountry = {
		name: undefined,
		size: undefined,
	};
	//compute dimensions
	const [totalWidth, totalHeight] = getTotalDimensions(dimensions, padding);
	const [totalLegendWidth, totalLegendHeight] = getTotalDimensions(
		legendDimensions,
		legendPadding
	);

	const svg = createSvg();

	const titleElement = createTitle();

	const descriptionElement = createDescription();
	const legendElement = createLegend();

	/*
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
  */

	const mapArea = svg
		.append("g")
		.attr("id", "mapArea")
		.attr("width", dimensions.width)
		.attr("height", dimensions.height)
		.attr("transform", `translate(${padding.left}, ${padding.top})`);

	const countriesArray = map.objects.countries;
	const countriesFeatureCollection = topojson.feature(map, countriesArray);

	const projection = d3
		.geoMercator()
		.fitSize(
			[mapArea.attr("width"), mapArea.attr("height")],
			countriesFeatureCollection
		);
	const path = d3.geoPath().projection(projection);

	const tooltip = d3
		.select("#visHolder")
		.append("div")
		.style("opacity", 0)
		.attr("id", "tooltip")
		.style("font-size", "16px");

	const correctedData = dataCorrecter(data);
	const countryData = getCountryDataWithSize();

	const countries = mapArea
		.append("g")
		.selectAll("path")
		.data(countryData)
		.join("path")
		.attr("class", "country")
		.attr("d", path)
		.on("click", countryClick)
		.on("mouseover", countryMouseover)
		.on("mousemove", countryMousemove)
		.on("mouseleave", countryMouseleave)
		.attr("stroke", "black");

	function countryMouseover(_e, d) {
		const hoveredCountrySize = d.size;
		const hoveredCountryName = d.properties.name;
		tooltip
			.html(
				`${hoveredCountryName}: ${(d.size / selectedCountry.size) * 100}% of ${
					selectedCountry.name
				}`
			)
			.style("opacity", 1)
			.attr("data-education", d3.select(this).attr("data-education"));
	}

	function countryMousemove(e) {
		tooltip
			.style("left", d3.pointer(e)[0] + 20 + "px")
			.style("top", d3.pointer(e)[1] - 50 + "px");
	}

	function countryMouseleave() {
		tooltip.style("opacity", 0);
		d3.select(this).style("stroke-width", 0.1);
	}

	function countryClick(_e, d) {
		selectedCountry = {
			name: d.properties.name,
			size: d.size,
		};
		const colorScale = getColorScale();
		updateCountryColors(this);

		updateLegend();

		function updateLegend() {
			const legendBar = d3.select("#legendBar");
			const min = d3.min(colorScale.domain());
			const max = d3.max(colorScale.domain());
			const expandedDomain = d3.range(
				min,
				max,
				(max - min) / legendDimensions.height
			);
			const legendYScale = updateLegendYScale();
			createLegendRectangles();
			createLegendZeroRectangle();
			/*
			const legendAxis = d3.axisRight(legendYScale);
			legendArea
				.append("g")
				.attr(
					"transform",
					`translate(${legendPadding.left},${legendPadding.top})`
				)
				.call(legendAxis);
			*/
			function createLegendZeroRectangle() {
				legendBar.select("#zeroRectangle").remove();
				legendBar
					.append("rect")
					.attr("id", "zeroRectangle")
					.attr("fill", "black")
					.attr("height", 1)
					.attr("width", legendDimensions.width)
					.attr("y", legendYScale(1));
			}
			function createLegendRectangles() {
				legendBar.selectAll("rect").remove();
				legendBar
					.selectAll("rect")
					.data(expandedDomain)
					.join("rect")
					.attr("fill", colorScale)
					.attr("height", 1)
					.attr("width", legendDimensions.width)
					.attr("y", (_d, i) => legendDimensions.height - i);
			}
			function updateLegendYScale() {
				return d3
					.scaleLinear()
					.domain([min, max])
					.range([legendDimensions.height, 0]);
			}
		}
		function getColorScale() {
			const extent = d3.extent(
				countryData,
				(d) => d.size / selectedCountry.size
			);
			return d3
				.scaleDiverging()
				.domain([extent[0], 1, extent[1]])
				.interpolator(d3.interpolatePuOr);
		}

		function updateCountryColors(e) {
			d3.selectAll(".country")
				.attr("fill", (d) => colorScale(d.size / selectedCountry.size))
				.attr("stroke-width", 0);
			d3.select(e).attr("stroke-width", 1);
		}
	}

	const mesh = topojson.mesh(map, map.objects.countries, (a, b) => a !== b);
	const borders = mapArea
		.append("path")
		.attr("fill", "none")
		.attr("stroke", "grey")
		.attr("stroke-width", 1)
		.attr("stroke-linecap", "round")
		.attr("stroke-linejoin", "round")
		.attr("d", path(mesh));

	function getCountryDataWithSize() {
		return countriesFeatureCollection.features.map((feature) => {
			const name = feature.properties.name;
			const dataRow = correctedData.find((row) => row.country === name);
			const size = dataRow !== undefined ? dataRow.area : undefined;
			//for wrong names
			//if (size === undefined) console.log(name);
			return { ...feature, size };
		});
	}

	function getTotalDimensions(dimensions, padding) {
		return [
			dimensions.width + padding.left + padding.right,
			dimensions.height + padding.top + padding.bottom,
		];
	}

	function createSvg() {
		return d3
			.select(`#${targetId}`)
			.append("svg")
			.attr("id", chartId)
			.attr("width", totalWidth)
			.attr("height", totalHeight)
			.attr("viewBox", [0, 0, totalWidth, totalHeight])
			.attr("style", "width: 100%; height: auto; height: intrinsic;");
	}

	function createTitle() {
		return svg
			.append("text")
			.attr("id", "title")
			.text(title)
			.attr("y", 20)
			.attr("x", 10);
	}

	function createDescription() {
		return svg
			.append("text")
			.attr("id", "description")
			.text(description)
			.attr("y", 50)
			.attr("x", 20);
	}

	function createLegend() {
		const legendArea = createLegendArea();
		const legendXScale = getLegendXScale();
		const legendBarArea = createLegendBarArea();
		function getLegendXScale() {
			return d3.scaleBand().domain([0, 1]).range([0, legendDimensions.width]);
		}
		function createLegendBarArea() {
			return legendArea
				.append("svg")
				.attr("id", "legendBar")
				.attr(
					"transform",
					`translate(${legendPadding.left}, ${legendPadding.top})`
				)
				.attr("height", legendDimensions.height)
				.attr("width", legendDimensions.width);
		}
		function createLegendArea() {
			return svg
				.append("svg")
				.attr("id", "legendArea")
				.attr(
					"transform",
					`translate(${legendPosition.x}, ${legendPosition.y})`
				)
				.attr("height", totalLegendHeight)
				.attr("width", totalLegendWidth);
		}

		return legendArea;
	}
}
