var d3 = require("d3"),
    audio = require("./audio.js"),
    video = require("./video.js"),
    minimap = require("./minimap.js"),
    sampleWave = require("./sample-wave.js"),
    logger = require("../lib/logger/"),
    getRenderer = require("../renderer/"),
    getWaveform = require("./waveform.js");

var context = d3.select("canvas").node().getContext("2d");

var theme,
    caption,
    file,
    background,
    backgroundInfo,
    selection;

function _file(_) {
  return arguments.length ? (file = _) : file;
}

function _background(_) {
  return arguments.length ? background = _ : background;
}

function _backgroundInfo(_) {
  return arguments.length ? (backgroundInfo = _, redraw()) : backgroundInfo;
}

function _theme(_) {
  return arguments.length ? (theme = _, redraw()) : theme;
}

function _caption(_) {
  return arguments.length ? (caption = _, redraw()) : caption;
}

function _selection(_) {
  return arguments.length ? (selection = _) : selection;
}

bbcDog = new Image();
bbcDog.src = "/images/bbc.png";

minimap.onBrush(function(extent){

  var duration = audio.duration();
  // var minimapWidth = d3.select("#minimap svg").node().getBoundingClientRect().width;
  var minimapWidth = jQuery("#minimap svg").width();

  selection = {
    duration: duration * (extent[1] - extent[0]),
    start: extent[0] ? extent[0] * duration : null,
    end: extent[1] <= 1 ? extent[1] * duration : null
  };

  var x1 = Math.min(Math.max(extent[0]*minimapWidth - 38, 0), minimapWidth - 150),
      x2 = Math.min(Math.max(extent[1]*minimapWidth - 38, 75), minimapWidth - 75),
      diff = x2 - x1 - 75;

  if (diff<0) {
    x1 += diff/2;
    x2 -= diff/2;
  }

  d3.select("#start")
    .property("value", Math.round(100 * (selection.start || 0) ) / 100 )
    .style("left", x1+"px");
  d3.select("#end")
    .property("value", Math.round(100 * (selection.end || selection.duration) ) / 100 )
    .style("left", x2+"px");

  d3.select("#duration strong").text(Math.round(10 * selection.duration) / 10)
    .classed("red", theme && theme.maxDuration && theme.maxDuration < selection.duration);

});

// Resize video and preview canvas to maintain aspect ratio
function resize(width, height) {

  var wrapperWidth = d3.select("#canvas").node().getBoundingClientRect().width;
  if (!wrapperWidth) return;

  var widthFactor = wrapperWidth / width,
      heightFactor = (wrapperWidth*9/16) / height,
      factor = Math.min(widthFactor, heightFactor);

  d3.select("canvas")
    .attr("width", wrapperWidth)
    .attr("height", wrapperWidth*(height/width));

  d3.select("video")
    .attr("height", widthFactor * height);

  d3.select("#video")
    .attr("height", (widthFactor * height) + "px");

  context.setTransform(widthFactor, 0, 0, widthFactor, 0, 0);

}

function redraw() {

  resize(theme.width, theme.height);

  video.kill(); //'ed the radio star...

  var renderer = getRenderer(theme);

  renderer.bbcDog(bbcDog || null);
  renderer.backgroundImage(background || null);

  renderer.drawFrame(context, {
    caption: caption,
    waveform: sampleWave,
    backgroundInfo: backgroundInfo,
    frame: 0
  });

}

function loadAudio(audioFile, cb) {
  d3.queue()
    .defer(getWaveform, audioFile)
    .defer(audio.src, audioFile)
    .await(function(err, data){

      if (err) {
        return cb(err);
      }

      file = audioFile;
      minimap.redraw(data.peaks);

      cb(err);

    });

}

module.exports = {
  caption: _caption,
  theme: _theme,
  file: _file,
  background: _background,
  backgroundInfo: _backgroundInfo,
  loadAudio: loadAudio,
  redraw: redraw,
  selection: _selection
};
