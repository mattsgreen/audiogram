var d3 = require("d3");

var minimap = d3.select("#minimap"),
    svg = minimap.select("svg"),
    onBrush = onBrushEnd = function(){};

var y = d3.scaleLinear()
  .domain([0, 1])
  .range([40, 0]);

var line = d3.line();

var brush = d3.brushX()
  .on("brush end", brushed);

function brushInit() {
  minimap.select(".brush").call(brush)
    .selectAll("rect")
    .attr("height", 80);
  brush.move(d3.select(".brush"), [0, 0]);
}

minimap.selectAll(".brush .resize")
  .append("line")
  .attr("x1",0)
  .attr("x2",0)
  .attr("y1",0)
  .attr("y2", 80);

var t, minimapWidth;
function _width(_) {
  if (arguments.length) {
    minimapWidth = _;
    t = d3.scaleLinear()
        .domain([0, _])
        .range([0,1])
        .clamp(true);
    d3.selectAll("#minimap svg, #minimap clipPath rect").attr("width", _);
    d3.selectAll("#minimap g.waveform line").attr("x2", _);
  } else {
    return minimapWidth;
  }
}

function redraw(data) {

  brushInit();

  var top = data.map(function(d,i){
    return [i, y(d)];
  });

  var bottom = top.map(function(d){
    return [d[0], 80 - d[1]];
  }).reverse();

  d3.selectAll("g.waveform path")
    .attr("d",line(top.concat(bottom)));

  time(0);

}

function time(t) {
  d3.select("g.time")
    .attr("transform","translate(" + (t * minimapWidth) + ")");
}

function drawBrush(extent) {
  brush.move(d3.select(".brush"), [t.invert(extent.start), t.invert(extent.end)]);
}

function brushed() {
  // brush.extent([0,1]);
  var start = d3.event.selection ? t(d3.event.selection[0]) : 0,
      end = d3.event.selection ? t(d3.event.selection[1]) : 1;

  if (start === end) {
    start = 0;
    end = 1;
  } else {
    // XXX Not sure why this was here originally, but it breaks things now
      // if (start <= 0.01) {
      //   start = 0;
      // }
      // if (end >= 0.99) {
      //   end = 1;
      // }
  }

  d3.select("clipPath rect")
      .attr("x", t.invert(start))
      .attr("width", t.invert(end - start));

  onBrush([start, end]);

  if (d3.event.type === "end") {
    onBrushEnd([start, end]);
  }

}

function _onBrush(_) {
  onBrush = _;
}

function _onBrushEnd(_) {
  onBrushEnd = _;
}

module.exports = {
  time: time,
  redraw: redraw,
  drawBrush: drawBrush,
  width: _width,
  onBrush: _onBrush,
  onBrushEnd: _onBrushEnd
};
