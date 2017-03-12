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
    backgroundType,
    backgroundImageSize,
    selection;

function _file(_) {
  return arguments.length ? (file = _) : file;
}

function _background(_) {
  return arguments.length ? background = _ : background;
}

function _backgroundType(_) {
  return arguments.length ? backgroundType = _ : backgroundType;
}

function _backgroundImageSize(_) {
  return arguments.length ? (backgroundImageSize = _, redraw()) : backgroundImageSize;
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

  selection = {
    duration: duration * (extent[1] - extent[0]),
    start: extent[0] ? extent[0] * duration : null,
    end: extent[1] < 1 ? extent[1] * duration : null
  };

  d3.select("#duration strong").text(Math.round(10 * selection.duration) / 10)
    .classed("red", theme && theme.maxDuration && theme.maxDuration < selection.duration);

});

// Resize video and preview canvas to maintain aspect ratio
function resize(width, height) {

  var widthFactor = 640 / width,
      heightFactor = 360 / height,
      factor = Math.min(widthFactor, heightFactor);

  d3.select("canvas")
    .attr("width", factor * width)
    .attr("height", factor * height);

  d3.select("#canvas")
    .style("width", (factor * width) + "px");

  d3.select("video")
    .attr("height", widthFactor * height);

  d3.select("#video")
    .attr("height", (widthFactor * height) + "px");

  context.setTransform(factor, 0, 0, factor, 0, 0);

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
    backgroundType, backgroundType,
    backgroundImageSize: backgroundImageSize,
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
  backgroundType: _backgroundType,
  backgroundImageSize: _backgroundImageSize,
  loadAudio: loadAudio,
  selection: _selection
};
