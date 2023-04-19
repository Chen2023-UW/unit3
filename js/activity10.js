//wrap everything is immediately invoked anonymous function so nothing is in global scope
//consider change projection type
//consider equal display quality on different platform

(function (){

	//pseudo-global variables
    //original topojson have more attribute beyond those seven
    var attrArray = ["TotalManufacturingOutput", "ManufacturingFirms", "ManufacturingEmployment","AverageAnnualCompensation","ManufacturedGoodsExports"]; 
	var expressed = attrArray[0]; //initial attribute

    //move chart to here:
    //chart frame dimensions:
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 400,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";


    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([405, 0])
        .domain([0, 200]);    


	//begin script when window loads
	window.onload = setMap();


	function setMap(){

	    //map frame dimensions
    	var width = 765,
        height = 450;

	    //create new svg container for the map
	    var map = d3.select("body")
	        .append("svg")
	        .attr("class", "map")
	        .attr("width", width)
	        .attr("height", height);

	    //create Albers equal area conic projection, considering change it to wgs1984
	    var projection = d3.geoAlbers()
	        .center([-87,42])
	        .rotate([0, 0, 0])
	        .parallels([20, 50])
	        .scale(1500)
            .angle(50)
	        .translate([width / 2, height / 2]);

	    var path = d3.geoPath()
	        .projection(projection);

	    //use Promise.all to parallelize asynchronous data loading
	    var promises = [d3.csv("data/lab2stats.csv"),
	                d3.json("data/spatialfile.topojson"),
                    d3.json("data/basemap.topojson")];

	    Promise.all(promises).then(callback);

	    function callback(data){
			var csvData = data[0], america = data[1], canvas = data[2];
	        setGraticule(map,path);

	        //translate europe TopoJSON
	        var americastates = topojson.feature(america, america.objects.exportsample).features;
            var canvas = topojson.feature(canvas, canvas.objects.basemap);

            var country = map
                .append("path")
                .datum(canvas)
                .attr("class", "country")
                .attr("d", path);

	        var colorScale = makeColorScale(csvData);

	        setEnumerationUnits(americastates,map,path,colorScale);

	        //add coordinated visualization to the map
        	setChart(csvData, colorScale);

            //add drop down
            createDropdown(csvData);

	    };

	    
	};

	function setGraticule(map,path){
		var graticule = d3.geoGraticule()
	            .step([5, 5]); //place graticule lines every 5 degrees of longitude and latitude

	        //create graticule background
	        var gratBackground = map.append("path")
	            .datum(graticule.outline()) //bind graticule background
	            .attr("class", "gratBackground") //assign class for styling
	            .attr("d", path) //project graticule

	        //create graticule lines
	        var gratLines = map.selectAll(".gratLines") //select graticule elements that will be created
	            .data(graticule.lines()) //bind graticule lines to each element to be created
	            .enter() //create an element for each datum
	            .append("path") //append each element to the svg as a path element
	            .attr("class", "gratLines") //assign class for styling
	            .attr("d", path); //project graticule lines
	}


	function makeColorScale(data){

		var colorClasses = [
	        
            "#6c9e5d",//light green
            "#D1A841",//yellow sand
	        "#91711F",//dark yellow
            "#6B5316",//orange brown
	        "#45350E"//brown
	    ];

	    //create color scale generator
	    var colorScale = d3.scaleQuantile()
	        .range(colorClasses);

	    //build array of all values of the expressed attribute
	    var domainArray = [];
	    for (var i=0; i<data.length; i++){
	        var val = parseFloat(data[i][expressed]);
	        domainArray.push(val);
	    };

	    //assign array of expressed values as scale domain
	    colorScale.domain(domainArray);

	    return colorScale;
	}

function setEnumerationUnits(americastates,map,path,colorScale){
	//add states to map
    var regions = map.selectAll(".regions")
        .data(americastates)
        .enter()
        .append("path")
        .attr("class", function(d){
            return "regions " + d.properties.State;
        })
        .attr("d", path)
        .style("fill", function(d){
            var value = d.properties[expressed];
            if(value) {
            	return colorScale(d.properties[expressed]);
            } else {
            	return "#ccc";
            }
    })
    .on("mouseover",function(event,d){
        highlight(d.properties);
    })
    .on("mouseout",function (event,d){
        dehighlight(d.properties);
    })
    .on("mousemove", moveLabel);

    var desc = regions.append("desc").text('{"stroke": "#000", "stroke-width": "0.25px" }');
}

//function to create coordinated bar chart
function setChart(csvData, colorScale){

    //create a second svg element to hold the bar chart
    var chart = d3.select("body")
        .append("svg")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("class", "chart");

    //create a rectangle for chart background fill
    var chartBackground = chart.append("rect")
        .attr("class", "chartBackground")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);

    //create a scale to size bars proportionally to frame and for axis

    //set bars for each province
    var bars = chart
        .selectAll(".bar")
        .data(csvData)
        .enter()
        .append("rect")
        .sort(function(a, b){
            return b[expressed]-a[expressed]
        })
        .attr("class", function(d){
            return "bar " + d.State;
        })
        .attr("width", chartInnerWidth / csvData.length - 1)

        .on("mouseover",function(event,d){
            highlight(d);
        })
        .on("mouseout",function (event,d){
            dehighlight(d);
        })
        .on("mousemove", moveLabel)

        .attr("x", function(d, i){
            return i * (chartInnerWidth / csvData.length) + leftPadding;
        })
        .attr("height", function(d, i){
            return 400 - yScale(parseFloat(d[expressed]));
        })
        .attr("y", function(d, i){
            return yScale(parseFloat(d[expressed])) - topBottomPadding;
        })
        .style("fill", function(d){
            return colorScale(d[expressed]);
        });

    //create a text element for the chart title
    var chartTitle = chart.append("text")
        .attr("x", 40)
        .attr("y", 40)
        .attr("class", "chartTitle")
        .text("Amount of " + expressed + " in each state");

    //create vertical axis generator
    var yAxis = d3.axisLeft()
        .scale(yScale);

    //place axis
    var axis = chart.append("g")
        .attr("class", "axis")
        .attr("transform", translate)
        .call(yAxis);

    //create frame for chart border
    var chartFrame = chart.append("rect")
        .attr("class", "chartFrame")
        .attr("width", chartInnerWidth)
        .attr("height", chartInnerHeight)
        .attr("transform", translate);
};
    
    //function to create dropdown menu
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
        .append("select")
        .attr("class","dropdown")
        .on("change",function(){
            changeAttribute(this.value, csvData);
        });

        //add initial option
        var titleOption = dropdown
            .append("option")
            .attr("class","titleOption")
            .attr("disabled","true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown
            .selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function (d){
                return d;
            })    
            .text(function (d){
                return d;
            });
    }

    //dropdown change event listener
    function changeAttribute(attribute, csvData){
        //change expressed attribute
        expressed = attribute;

        //recreate color
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions").style("fill",function (d){
            var value  = d.properties[expressed];
            if(value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });

        //recolor bars
        var bars = d3.selectAll(".bar")
            .sort(function(a,b){
                return b[expressed] - a[expressed];
            })
            .transition()
            .delay(function(d,i){
                return i * 20;
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);

    }

    function updateChart(bars, n, colorScale) {
        //position bars
        bars.attr("x", function (d, i) {
            return i * (chartInnerWidth / n) + leftPadding;
        })
            //size/resize bars
            .attr("height", function (d, i) {
                return 400 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function (d, i) {
                return yScale(parseFloat(d[expressed])) - topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function (d) {
                var value = d[expressed];
                if (value) {
                    return colorScale(value);
                } else {
                    return "#ccc";
                }
            });

        //at the bottom of updateChart()...add text to chart title
        var chartTitle = d3
            .select(".chartTitle")
            .text("Amount of " + expressed + " in each state");
    }

    //function to highlight enumeration units and bars
    function highlight(props) {
        //change stroke
        var selected = d3
            .selectAll("." + props.State)
            .style("stroke", "blue")
            .style("stroke-width", "2");
        setLabel(props);
    }

    //function to reset the element style on mouseout
    function dehighlight(props) {
        var selected = d3
            .selectAll("." + props.State)
            .style("stroke", function () {
                return getStyle(this, "stroke");
            })
            .style("stroke-width", function () {
                return getStyle(this, "stroke-width");
            });

        function getStyle(element, styleName) {
            var styleText = d3.select(element).select("desc").text();

            var styleObject = JSON.parse(styleText);

            return styleObject[styleName];
        }
        //remove info label
        d3.select(".infolabel").remove();
    }

    //function to create dynamic label
    function setLabel(props) {
        console.log("here!");
        //label content
        var labelAttribute = "<h1>" + props[expressed] + "</h1><b>" + expressed + "</b>";

        //create info label div
        var infolabel = d3
            .select("body")
            .append("div")
            .attr("class", "infolabel")
            .attr("id", props.State + "_label")
            .html(labelAttribute);

        var regionName = infolabel.append("div").attr("class", "labelname").html(props.NAME);
    }

    //function to move info label with mouse
    function moveLabel() {
        //get width of label
        var labelWidth = d3.select(".infolabel").node().getBoundingClientRect().width;

        //use coordinates of mousemove event to set label coordinates
        var x1 = event.clientX + 10,
            y1 = event.clientY - 75,
            x2 = event.clientX - labelWidth - 10,
            y2 = event.clientY + 25;

        //horizontal label coordinate, testing for overflow
        var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1;
        //vertical label coordinate, testing for overflow
        var y = event.clientY < 75 ? y2 : y1;

        d3.select(".infolabel")
            .style("left", x + "px")
            .style("top", y + "px");
    }

})();