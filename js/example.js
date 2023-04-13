window.onload = setMap();
//original projection is wgs-1984

function setMap(){
    //set map frame
    var width = 1400,
    height = 850;
    
    var map = d3.select("body")
    .append("svg")
    .attr("class", "map")
    .attr("width", width)
    .attr("height", height);
    
    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([-87, 42])
        .rotate([0, 0, 0])
        .parallels([20 , 50])
        .scale(1750)
        .angle(50)
        .translate([width / 2, height / 2]);

    var path = d3.geoPath()
        .projection(projection);
    
    var promises = [
        d3.csv("data/lab2stats.csv"),
        d3.json("data/spatialfile.topojson")
    ]

Promise.all(promises).then(callback);

function callback(data){

    //console.log(data)
    var csvData = data[0],
        basemap = data[1];

    var spatialFile = topojson.feature(basemap, basemap.objects.exportsample).features;
    //console.log(data)

    //add three us regions to map
   /*var states = map.append("path")
        .datum(spatialFile)
        .attr("class", "NAME")
        .attr("d", path);*/

       //add France regions to map
       var regions = map.selectAll(".regions")
       .data(spatialFile)
       .enter()
       .append("path")
       .attr("class", function(d){
           return "NAME " + d.properties.State;
       })
       .attr("d", path);
}

}
