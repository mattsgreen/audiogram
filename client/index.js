var d3 = require("d3"),
    $ = require("jquery"),
    preview = require("./preview.js"),
    minimap = require("./minimap.js"),
    video = require("./video.js"),
    audio = require("./audio.js");

var backgroundFile;

d3.json("/settings/themes.json", function(err, themes){

  var errorMessage;

  // Themes are missing or invalid
  if (err || !d3.keys(themes).filter(function(d){ return d !== "default"; }).length) {
    if (err instanceof SyntaxError) {
      errorMessage = "Error in settings/themes.json:<br/><code>" + err.toString() + "</code>";
    } else if (err instanceof ProgressEvent) {
      errorMessage = "Error: no settings/themes.json.";
    } else if (err) {
      errorMessage = "Error: couldn't load settings/themes.json.";
    } else {
      errorMessage = "No themes found in settings/themes.json.";
    }
    d3.select("#loading-bars").remove();
    d3.select("#loading-message").html(errorMessage);
    if (err) {
      throw err;
    }
    return;
  }

  for (var key in themes) {
    themes[key] = $.extend({}, themes.default, themes[key]);
  }

  preloadImages(themes);

});

function getURLParams(qs) {
    qs = qs.split('+').join(' ');
    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;
    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params;
}
var params = getURLParams(document.location.search);

function submitted() {

  d3.event.preventDefault();

  var theme = preview.theme(),
      caption = preview.caption(),
      selection = preview.selection(),
      backgroundInfo = preview.backgroundInfo(),
      audioFile = preview.file()

  if (!audioFile) {
    d3.select("#row-audio").classed("error", true);
    return setClass("error", "No audio file selected.");
  }

  if (theme.maxDuration && selection.duration > theme.maxDuration) {
    return setClass("error", "Your Audiogram must be under " + theme.maxDuration + " seconds.");
  }

  if (!theme || !theme.width || !theme.height) {
    return setClass("error", "No valid theme detected.");
  }

  video.kill();
  audio.pause();

  var formData = new FormData();

  formData.append("audio", audioFile);
  formData.append("background", backgroundFile);
  formData.append("backgroundInfo", JSON.stringify(backgroundInfo));
  if (selection.start || selection.end) {
    formData.append("start", selection.start);
    formData.append("end", selection.end);
    formData.append("duration", selection.end - selection.start);
  } else {
    formData.append("duration", audio.duration());
  }
  formData.append("theme", JSON.stringify($.extend({}, theme, { backgroundImageFile: null })));
  formData.append("caption", caption);

  setClass("loading");
  d3.select("#loading-message").text("Uploading audio...");

	$.ajax({
		url: "/submit/",
		type: "POST",
		data: formData,
		contentType: false,
    dataType: "json",
		cache: false,
		processData: false,
		success: function(data){
      poll(data.id, 0);
		},
    error: error

  });

}

function poll(id) {

  setTimeout(function(){
    $.ajax({
      url: "/status/" + id + "/",
      error: error,
      dataType: "json",
      success: function(result){
        if (result && result.status && result.status === "ready" && result.url) {
          video.update(result.url, preview.theme().name);
          setClass("rendered");
        } else if (result.status === "error") {
          console.log("RLW status error");
          error(result.error);
        } else {
          d3.select("#loading-message").text(statusMessage(result));
          poll(id);
        }
      }
    });

  }, 2500);

}

function error(msg) {
  console.log("RLW  client error function: "  + msg.code + " / " + msg.name + " / " + msg.message);

  if (msg.responseText) {
    msg = msg.responseText;
  }

  if (typeof msg !== "string") {
    msg = JSON.stringify(msg);
  }

  if (!msg) {
    msg = "Unknown error";
  }

  d3.select("#loading-message").text("Loading...");
  setClass("error", msg);

}

function stopIt(e) {
  if (e.preventDefault) {
      e.preventDefault();
  }
  if (e.stopPropagation) {
      e.stopPropagation();
  }
}

// Once images are downloaded, set up listeners
function initialize(err, themesWithImages) {

  console.log("RLW initializing");

  // Populate dropdown menu
  d3.select("#input-theme")
    .on("change", updateTheme)
    .selectAll("option")
    .data(themesWithImages)
    .enter()
    .append("option")
      .text(function(d){
        return d.name;
      });

  // Get initial theme
  d3.select("#input-theme").each(updateTheme);

  // Get initial caption (e.g. back button)
  d3.select("#input-caption").on("change keyup", updateCaption).each(updateCaption);

  // Trim input listeners
  d3.selectAll("#start, #end").on("change", updateTrim).each(updateTrim);

  // Key listeners
  d3.select(document).on("keydown", function(){
    if (!d3.select("body").classed("rendered") && !d3.matcher("input, textarea, button, select").call(d3.event.target)) {
      let start = audio.extent()[0]*audio.duration(),
          end = audio.extent()[1]*audio.duration(),
          duration = audio.duration();
          current = audio.currentTime();
      switch (d3.event.key) {
        case " ":
          audio.toggle();
          stopIt(d3.event);
          break;
        case "ArrowLeft":
          if (d3.event.shiftKey) {
            audio.currentTime(current-10);
          } else if (d3.event.ctrlKey || d3.event.metaKey) {
            audio.currentTime(current-1);
          } else {
            audio.currentTime(current-0.1);
          }
          stopIt(d3.event);
          break;
        case "ArrowRight":
          if (d3.event.shiftKey) {
            audio.currentTime(current+10);
          } else if (d3.event.ctrlKey || d3.event.metaKey) {
            audio.currentTime(current+1);
          } else {
            audio.currentTime(current+0.1);
          }
          stopIt(d3.event);
          break;
        case "q":
          audio.currentTime(start);
          stopIt(d3.event);
          break;
        case "w":
          audio.pause();
          audio.currentTime(end);
          stopIt(d3.event);
          break;
        case "i":
          updateTrim([current,null]);
          stopIt(d3.event);
          break;
        case "o":
          updateTrim([null,current]);
          stopIt(d3.event);
          break;
        case "5":
          audio.play(start,start+1,start);
          stopIt(d3.event);
          break;
        case "6":
          audio.play(end-1,end);
          stopIt(d3.event);
          break;
      }
    }
  });
  d3.select("#tip a").on("click", function(){
    d3.select("#shortcuts").style("display", null);
    d3.select("#tip").insert("span","a").text(d3.select("#tip a").text());
    d3.select("#tip a").remove();
    stopIt(d3.event);
  });

  // Button listeners
  d3.selectAll("#play, #pause").on("click", function(){
    d3.event.preventDefault();
    audio.toggle();
  });

  d3.select("#restart").on("click", function(){
    d3.event.preventDefault();
    audio.restart();
  });

  // If there's an initial background image (e.g. back button) load it
  d3.select("#input-background").on("change", updateBackground).each(updateBackground); //try deleting the each and see if it all still works. claim biscuit prize from squio

  // If there's an initial piece of audio (e.g. back button) load it
  d3.select("#input-audio").on("change", updateAudioFile).each(updateAudioFile);
  if (params.vcs && params.vcs.startsWith("https://vcsio.newslabs.co")) {
    d3.select("#loading-message").text("Loading VCS Audio...");
    setClass("loading");
    var blob = null;
    var xhr = new XMLHttpRequest(); 
    xhr.open("GET", params.vcs); 
    xhr.responseType = "blob";
    xhr.onload = function() {
        updateAudioFile(xhr.response);
    }
    xhr.send();
  }

  d3.select("#return").on("click", function(){
    d3.event.preventDefault();
    video.kill();
    setClass(null);
  });

  d3.select("#submit").on("click", submitted);

}

function updateAudioFile(blob) {

  d3.select("#row-audio").classed("error", false);

  audio.pause();
  video.kill();

  // Skip if empty
  if (!blob && (!this.files || !this.files[0])) {
    d3.select("#minimap").classed("hidden", true);
    preview.file(null);
    setClass(null);
    return true;
  }

  d3.select("#loading-message").text("Analyzing...");

  setClass("loading");

  var audioFile = blob || this.files[0];

  preview.loadAudio(audioFile, function(err){

    if (err) {
      d3.select("#row-audio").classed("error", true);
      setClass("error", "Error decoding audio file");
    } else {
      setClass(null);
    }

    d3.selectAll("#minimap, #submit").classed("hidden", !!err);

  });

}

function updateBackground() {

    d3.select("#row-background").classed("error", false);

    // Skip if empty
    if (!this.files || !this.files[0]) {
        preview.background(null);
        setClass(null);
        return true;
    }

    backgroundFile = this.files[0];

    if (backgroundFile.type.startsWith("video")) {

      var vid = document.createElement("video");
      vid.autoplay = false;
      vid.loop = false;
      vid.style.display = "none";
      vid.addEventListener("loadeddata", function(){
          setTimeout(function(){
            preview.background(vid);
            preview.backgroundInfo({type: backgroundFile.type, height: vid.videoHeight, width: vid.videoWidth, duration: vid.duration});
          });
      }, false);
      var source = document.createElement("source");
      source.type = backgroundFile.type;
      source.src = window.URL.createObjectURL( backgroundFile );
      vid.appendChild(source);

    } else if (backgroundFile.type.startsWith("image")) {

      function getImage(file) {
        var backgroundImageFile = new Image();
        backgroundImageFile.src = window.URL.createObjectURL( file );
        return backgroundImageFile;
      }

      backgroundImage = getImage(backgroundFile);
      preview.background(backgroundImage);
      backgroundImage.onload = function() {
        preview.backgroundInfo({type: backgroundFile.type, height: this.height, width: this.width});
      }

    } else {

      setClass("error", "That file type can't be used in the background.");
      return true;

    }
    setClass(null);

}

function updateCaption() {
  preview.caption(this.value);
}

function updateTrim(extent) {
  extent = extent || [];
  var start = extent[0] || parseFloat(d3.select("#start").property("value"));
  var end = extent[1] || parseFloat(d3.select("#end").property("value"));
  if (!isNaN(start) && !isNaN(end)) {
    if (start>end) [start, end] = [end, start];
    var duration = Math.round(100*audio.duration())/100;
    start = start/duration;
    end = end/duration;
    minimap.drawBrush({start: start, end: end});
  }
}

function updateTheme() {
  preview.theme(d3.select(this.options[this.selectedIndex]).datum());
}

function preloadImages(themes) {

  // preload images
  var imageQueue = d3.queue();

  d3.entries(themes).forEach(function(theme){

    if (!theme.value.name) {
      theme.value.name = theme.key;
    }

    if (theme.key !== "default") {
      imageQueue.defer(getImage, theme.value);
    }

  });

  imageQueue.awaitAll(initialize);

  function getImage(theme, cb) { //Q. where does this cb get passed in??

    if (!theme.backgroundImage) {
      return cb(null, theme);
    }

    theme.backgroundImageFile = new Image();
    theme.backgroundImageFile.onload = function(){
      return cb(null, theme);
    };
    theme.backgroundImageFile.onerror = function(e){
      console.warn(e);
      return cb(null, theme);
    };

    theme.backgroundImageFile.src = "/settings/backgrounds/" + theme.backgroundImage;  //Q.  i thought there needs to be an explicit return statement.  or is this all side-effect making?

  }

}

function setClass(cl, msg) {
  d3.select("body").attr("class", cl || null);
  d3.select("#error").text(msg || "");
}

function statusMessage(result) {

  switch (result.status) {
    case "queued":
      return "Waiting for other jobs to finish, #" + (result.position + 1) + " in queue";
    case "audio-download":
      return "Downloading audio for processing";
    case "trim":
      return "Trimming audio";
    case "video":
      return "Processing background video";
    case "probing":
      return "Probing audio file";
    case "waveform":
      return "Analyzing waveform";
    case "renderer":
      return "Initializing renderer";
    case "frames":
      var msg = "Generating frames";
      if (result.numFrames) {
        msg += ", " + Math.round(100 * (result.framesComplete || 0) / result.numFrames) + "% complete";
      }
      return msg;
    case "combine":
      return "Combining frames with audio";
    case "ready":
      return "Cleaning up";
    default:
      return JSON.stringify(result);
  }

}
