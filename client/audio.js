var minimap = require("./minimap.js"),
    d3 = require("d3");

var audio = document.querySelector("audio"),
    extent = [0, 1],
    stopAt = null;

// timeupdate is too low-res
d3.timer(update);

d3.select(audio).on("play", toggled)
  .on("pause", function(){ toggled(true); });

minimap.onBrushEnd(_extent);

function pause(time) {

  if (arguments.length) {
    audio.currentTime = time;
  }

  if (isPlaying()) {
    audio.pause();
  }

  toggled(true);

}

function play(time,end) {

  if (arguments.length) {
    audio.currentTime = time;
    stopAt = end || null;
  } else {
    stopAt = null;
  }

  audio.play();

  toggled();

}

function restart() {
  play(extent[0] * audio.duration);
}

function update() {

  if (audio.duration) {

    var pos = audio.currentTime / audio.duration;

    if (stopAt && pos >= stopAt/audio.duration) {
      pause();
      if (pos >= extent[1]) {
        audio.currentTime = extent[1] * audio.duration;
      } else {
        audio.currentTime = extent[0] * audio.duration;
      }
    } else if (audio.ended || pos >= extent[1] || audio.duration * extent[0] - audio.currentTime > 0.2) {
      // Need some allowance at the beginning because of frame imprecision (esp. FF)
      if (isPlaying()) {
        play(extent[0] * audio.duration);
      }
      // pause(extent[0] * audio.duration);
    }

    minimap.time(pos);

  }

}

function toggled(paused) {
  d3.select("#pause").classed("hidden", paused);
  d3.select("#play").classed("hidden", !paused);
}

function toggle() {
  if (isPlaying()) {
    pause();
  } else {
    play();
  }
}

function _extent(_) {

  if (arguments.length) {

    extent = _;

    var pos = audio.currentTime / audio.duration;

    if (pos > extent[1] || audio.duration * extent[0] - audio.currentTime > 0.2 || !isPlaying()) {
      pause(extent[0] * audio.duration);
    }

    minimap.time(pos);

  } else {
    return extent;
  }
}

function src(file, cb) {

  d3.select("audio")
    .on("canplaythrough", cb)
    .on("error", function(){
      cb(d3.event.target.error);
    })
    .select("source")
      .attr("type", file.type)
      .attr("src", URL.createObjectURL(file));

  audio.load();

}

function isPlaying() {
  return audio.duration && !audio.paused && !audio.ended && 0 < audio.currentTime;
}

function _duration() {
  return audio.duration;
}

function _currentTime(_) {
  return arguments.length ? audio.currentTime = _ : audio.currentTime;
}

module.exports = {
  play: play,
  pause: pause,
  toggle: toggle,
  src: src,
  restart: restart,
  isPlaying: isPlaying,
  extent: _extent,
  currentTime: _currentTime,
  duration: _duration
};
