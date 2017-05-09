var d3 = require("d3");

var video = document.querySelector("video");

function kill() {
  jQuery("#mediaPlayer").html("");
  d3.select("body").classed("rendered", false);
}

function update(url, theme) {

  var timestamp = d3.timeFormat("%Y-%m-%d-%-I:%M%p")(new Date).toLowerCase(),
      filename = "Audiogram" + timestamp + ".mp4",
      ratio = theme.height/theme.width;

  ratio = (ratio>1) ? 1 : ratio;

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

  // SMP
  smpRequireMap = {
    'jquery-1.9'  : 'https://static.bbci.co.uk/frameworks/jquery/0.3.0/sharedmodules/jquery-1.9.1',
    'swfobject-2' : 'https://static.bbci.co.uk/frameworks/swfobject/0.1.10/sharedmodules/swfobject-2',
    'bump-3'      : 'https://emp.bbci.co.uk/emp/bump-3/bump-3'
  };
  window.require({
    paths: smpRequireMap,
    waitSeconds: 30
  });

  window.require(['bump-3'],function ($) {
    var settings = {
          product: "news",
          autoplay: true,
          playlistObject: {
            holdingImageURL: window.location.protocol + "//" + window.location.host + url.replace(".mp4",".png"),
            items: [{
              href: [
              {
                url: window.location.protocol + "//" + window.location.host + url,
                format: "plain"
              }
              ]
            }]
          }
        }
    var mediaPlayer = $('#mediaPlayer').player(settings);
    mediaPlayer.load();
    mediaPlayer.bind('playing', function(e) {
      var width = jQuery('#mediaPlayer').width();
      jQuery('#mediaPlayer').height(width * Math.min(ratio,1));
      mediaPlayer.setData({name: "SMP.subtitlesHref", data:{ url : window.location.protocol + "//" + window.location.host + url.replace(".mp4",".xml") }});
    });
  });

}

module.exports = {
  kill: kill,
  update: update
}
