import { options } from "./options.js";
import { dataCorrecter } from "./dataCorrecter.js";

const SIZE_FILE =
	"https://raw.githubusercontent.com/samayo/country-json/master/src/country-by-surface-area.json";
const MAP_FILE =
	"https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

Promise.all([d3.json(SIZE_FILE), d3.json(MAP_FILE)])
	.then((data) => CountrySizeComparator(data[0], data[1], options))
	.catch((err) => console.error(err.message, err.lineNumber, err.fileName));

function CountrySizeComparator(
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
	//state
	let selectedCountry = undefined;
	let legendYScale = undefined;

	//compute dimensions
	const [totalWidth, totalHeight] = getTotalDimensions(dimensions, padding);
	const [totalLegendWidth, totalLegendHeight] = getTotalDimensions(
		legendDimensions,
		legendPadding
	);

	const countriesFeatureCollection = topojson.feature(
		map,
		map.objects.countries
	);

	const countryData = getCountryDataWithSize();

	const svg = createSvg();

	const titleElement = createTitle();

	const descriptionElement = createDescription();
	const legendElement = createLegend();
	const tooltip = d3
		.select("#visHolder")
		.append("div")
		.style("opacity", 0)
		.attr("id", "tooltip")
		.style("font-size", "16px");

	const mapElement = createMap();

	function createMap() {
		const mapArea = createMapArea();

		const projection = getProjection();

		const path = getPath();

		const countries = createCountries();

		const borders = createBorders();

		function createMapArea() {
			return svg
				.append("g")
				.attr("id", "mapArea")
				.attr("width", dimensions.width)
				.attr("height", dimensions.height)
				.attr("transform", `translate(${padding.left}, ${padding.top})`);
		}

		function getProjection() {
			return d3
				.geoMercator()
				.fitSize(
					[mapArea.attr("width"), mapArea.attr("height")],
					countriesFeatureCollection
				);
		}

		function getPath() {
			return d3.geoPath().projection(projection);
		}

		function createBorders() {
			const mesh = topojson.mesh(map, map.objects.countries, (a, b) => a !== b);
			mapArea
				.append("path")
				.attr("fill", "none")
				.attr("stroke", "grey")
				.attr("stroke-width", 1)
				.attr("stroke-linecap", "round")
				.attr("stroke-linejoin", "round")
				.attr("d", path(mesh));
		}

		function createCountries() {
			return mapArea
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
				const hoveredCountry = {
					name: d.properties.name,
					size: d.size,
				};
				editTooltip();
				createLegendMarker();
				createLegendMarkerLabel();
				function createLegendMarker() {
					const legendBar = d3.select("#legendBar");
					legendBar.select("#markerRectangle").remove();
					legendBar
						.append("rect")
						.attr("id", "markerRectangle")
						.attr("fill", "black")
						.attr("height", 1)
						.attr("width", legendDimensions.width)
						.attr(
							"y",
							legendYScale(hoveredCountry.size / selectedCountry.size)
						);
				}

				function createLegendMarkerLabel() {
					d3.select("#markerLabel").remove();
					d3.select("#legendArea")
						.append("text")
						.attr("id", "markerLabel")
						.text(hoveredCountry.name)
						.attr(
							"y",
							legendYScale(hoveredCountry.size / selectedCountry.size) +
								legendPadding.top
						)
						.attr("x", legendPadding.left + legendDimensions.width);
				}

				function editTooltip() {
					let html;
					if (
						!selectedCountry ||
						selectedCountry.name === hoveredCountry.name
					) {
						html = `${hoveredCountry.name}: ${d3.format(",.3r")(
							hoveredCountry.size
						)} km2`;
					} else {
						html = `${hoveredCountry.name}: ${d3.format(",.3r")(
							hoveredCountry.size
						)} km2 <br />
				${d3.format(",.1%")(d.size / selectedCountry.size)} of the size of ${
							selectedCountry.name
						} (${d3.format(",.3r")(selectedCountry.size)} km2)`;
					}
					changeTooltipContents(html);

					function changeTooltipContents(html) {
						tooltip.html(html).style("opacity", 1);
					}
				}
			}
			function countryMousemove(e) {
				tooltip
					.style("left", d3.pointer(e)[0] + 20 + "px")
					.style("top", d3.pointer(e)[1] - 50 + "px");
			}

			function countryMouseleave() {
				tooltip.style("opacity", 0);
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
					const expandedDomain = [
						...d3.range(min, 1, (1 - min) / (legendDimensions.height / 2)),
						...d3.range(1, max, (max - 1) / (legendDimensions.height / 2)),
					];
					console.log(expandedDomain);
					legendYScale = updateLegendYScale();
					createLegendRectangles();
					createLegendZeroRectangle();
					createLegendLabel();
					createLegendAxis();
					function createLegendAxis() {
						d3.select("#legendAxis").remove();
						const legendAxis = d3
							.axisLeft(legendYScale)
							.tickFormat(d3.format(".0%"))
							.tickSizeOuter(0)
							.tickValues([0.1, 0.25, 0.5, 1, 1.5, 2, 3]);

						//const removeUpperLine = (g) => g.select(".domain").remove();

						d3.select("#legendArea")
							.append("g")
							.attr(
								"transform",
								`translate(${legendPadding.left},${legendPadding.top})`
							)
							.call(legendAxis)
							.attr("id", "legendAxis");
					}

					function createLegendLabel() {
						d3.select("#zeroRectangleLabel").remove();
						d3.select("#legendArea")
							.append("text")
							.attr("id", "zeroRectangleLabel")
							.text(selectedCountry.name)
							.attr("y", legendYScale(1) + legendPadding.top)
							.attr("x", legendPadding.left + legendDimensions.width);
					}

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
							.scaleDivergingSymlog()
							.domain([min, 1, max])
							.range([legendDimensions.height, legendDimensions.height / 2, 0]);
					}
				}
				function getColorScale() {
					const extent = d3.extent(
						countryData,
						(d) => d.size / selectedCountry.size
					);
					return d3
						.scaleDivergingSymlog()
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
		}

		return mapArea;
	}

	function getCountryDataWithSize() {
		const correctedData = dataCorrecter(data);
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
