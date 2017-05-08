var d3 = require("d3");

var video = document.querySelector("video");

function kill() {

  // Pause the video if it's playing
  if (!video.paused && !video.ended && 0 < video.currentTime) {
    video.pause();
  }

  d3.select("body").classed("rendered", false);

}

function update(url, name) {

  var timestamp = d3.timeFormat(" - %Y-%m-%d at %-I.%M%p")(new Date).toLowerCase(),
      filename = (name || "Audiogram") + timestamp + ".mp4";

  d3.selectAll("#download-btns .download-video")
    .attr("download", filename)
    .attr("href", url);

  d3.select("#download-btns .download-srt")
    .attr("download", filename.replace(".mp4",".srt"))
    .attr("href", url.replace(".mp4",".srt"));

  d3.select("#download-btns .download-ebu")
    .attr("download", filename.replace(".mp4",".xml"))
    .attr("href", url.replace(".mp4",".xml"));

  d3.select(video).select("source")
    .attr("src", url);

  video.load();
  video.play();

}

module.exports = {
  kill: kill,
  update: update
}
