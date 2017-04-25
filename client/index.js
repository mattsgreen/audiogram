var d3 = require("d3"),
    $ = require("jquery"),
    transcript = require("./transcript.js"),
    preview = require("./preview.js"),
    minimap = require("./minimap.js"),
    video = require("./video.js"),
    audio = require("./audio.js");
global.jQuery = $;

var backgroundFile,
    vcsTranscriptTimeout,
    audioSource = "vcs";

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
    var raw = JSON.stringify(themes[key]);
    if (key!="default") themes[key]["raw"] = JSON.parse(raw);
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
      audioFile = preview.file();

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
  formData.append("backgroundInfo", JSON.stringify(backgroundInfo || theme.backgroundImageInfo[theme.orientation]));
  if (selection.start || selection.end) {
    formData.append("start", selection.start);
    formData.append("end", selection.end);
    formData.append("duration", selection.end - selection.start);
  } else {
    formData.append("duration", audio.duration());
  }
  formData.append("theme", JSON.stringify($.extend({}, theme, { backgroundImage: theme.backgroundImage ? theme.backgroundImage[theme.orientation] : null,
                                                                backgroundImageFile: null,
                                                                foregroundImage: theme.foregroundImage ? theme.foregroundImage[theme.orientation] : null })));
  formData.append("caption", caption);
  formData.append("transcript", JSON.stringify(transcript.toJSON()));

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

  console.log("Audiogram initializing...");

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

  // Initialize wave sliders
    $(".wave-slider").slider({
      range: true,
      min: 0,
      max: 100,
      values: [ 25, 75 ],
      slide: function( event, ui ) {
        var size = ui.values[1] - ui.values[0],
            pos = ui.values[0] + (size/2);
        if (jQuery(this).attr("name")=="vertical") {
          preview.themeConfig("wave.height",size/100);
          preview.themeConfig("wave.y",pos/100);
        } else {
          preview.themeConfig("wave.width",size/100);
          preview.themeConfig("wave.x",pos/100);
        }
      }
    });
    $(".subs-slider").slider({
      range: false,
      min: 0,
      max: 100,
      values: [ 50 ],
      slide: function( event, ui ) {
        preview.themeConfig("subtitles.margin." + jQuery(this).attr("name"), ui.value/100);
      }
    });

  // Get initial theme
  d3.select("#input-theme").each(updateTheme);

  // Edit theme config
  d3.selectAll(".themeConfig").on("change", updateThemeConfig);

  // Expand advanced configs
  d3.select("#group-theme-advanced button").on("click", function(){
    jQuery("#input-caption:not(:visible)").val("");
    jQuery("#section-theme .row:not(:visible)").removeClass("hidden");
    d3.select("#row-theme").classed("advanced", false);
  });
  d3.select("#group-wave-advanced button").on("click", function(){
    jQuery("#row-wave").addClass("advanced");
  });

  // Get initial caption (e.g. back button)
  d3.select("#input-caption").on("change keyup", updateCaption).each(updateCaption);

  // Trim input listeners
  d3.selectAll("#start, #end").on("change", updateTrim).each(updateTrim);

  // Key listeners
  d3.select(document).on("keydown", function(){
    if (!d3.select("body").classed("rendered") && !d3.matcher("input, textarea, button, select, [contenteditable='true']").call(d3.event.target)) {
      var start = audio.extent()[0]*audio.duration(),
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
  d3.select("#controls .tip a").on("click", function(){
    jQuery("#shortcuts").toggleClass("hidden");
    stopIt(d3.event);
  });
  d3.selectAll(".subFormatToggle").on("click", function(){
    $("#transcript .subFormatToggle, #transcript-settings").toggleClass("hidden");
  })

  // Button listeners
  d3.selectAll("#play, #pause").on("click", function(){
    d3.event.preventDefault();
    audio.toggle();
  });

  d3.select("#restart").on("click", function(){
    d3.event.preventDefault();
    audio.restart();
  });

  d3.selectAll("a[href^='#source-tab-']").on("click", sourceUpdate);

  // If there's an initial piece of audio (e.g. back button) load it
  d3.select("#input-audio").on("change", updateAudioFile).each(updateAudioFile);

  // If there's an initial background image (e.g. back button) load it
  jQuery(document).on('change', '#input-background', updateBackground);

  d3.select("#return").on("click", function(){
    d3.event.preventDefault();
    video.kill();
    setClass(null);
  });

  d3.select("#submit").on("click", submitted);

  d3.select(window).on("resize", windowResize).each(windowResize);

  // Fetch broadcast audio
  d3.selectAll("input[id^='input-tx-']").on("keyup", txTimeUpdate);
  d3.select("#tx-search").on("click", txSearch);

  // Set background video
  d3.select("#videoload a").on("click", setBackground);

  // Search for VCS audio
  d3.select("#vcs-search").on("click", vcsSearch);
  d3.select("#input-vcs").on("keydown", function(){
    if (d3.event.key == "Enter") vcsSearch();
  });
  // Select VCS audio
  jQuery("#vcs-results").on('change','input:radio',function () {
    vcsAudio(this.value);
  });
  if (params.vcsid) {
    vcsSearch(params.vcsid,params.vcs);
  }

}

function windowResize() {
  preview.redraw();
  minimap.width(jQuery("#sourceWrapper .tab-content").width());
}

function sourceUpdate() {
  audioSource = this.href.split("-").pop();
  transcript.clear();
  if (audioSource == "vcs") {
    if (jQuery("#vcs-results input:radio").length) {
      vcsAudio(jQuery("#vcs-results input:radio").val());
    } else {
      updateAudioFile(false);
    }
  } else if (audioSource == "upload") {
    updateAudioFile();
  } 
}

function generateTranscript(blob) {

  var upload = jQuery('#input-audio').get(0);
  var audioFile = blob || upload.files[0];

  d3.select("#transcript").classed("loading", true);
  transcript.generate(audioFile);

}

function loadAudioFromURL(url) {
  var blob = null;
  var xhr = new XMLHttpRequest(); 
  xhr.open("GET", url); 
  xhr.responseType = "blob";
  xhr.onload = function() {
    updateAudioFile(xhr.response);
  }
  xhr.send();
}

function updateAudioFile(blob) {

  d3.select("#row-audio").classed("error", false);
  audio.pause();
  video.kill();

  var upload = jQuery('#input-audio').get(0);

  // Skip if empty
  if ( blob===false || (blob===undefined && (!upload.files || !upload.files[0])) ) {
    d3.select("#minimap").classed("hidden", true);
    preview.file(null);
    setClass(null);
    return true;
  }

  var audioFile = blob || upload.files[0];

  if (audioSource!="vcs") {
    clearTimeout(vcsTranscriptTimeout);
    generateTranscript(audioFile);
  }

  d3.select("#splash").classed("hidden", true);
  d3.selectAll("#subtitles, #transcript").classed("hidden", false);

  d3.select("#loading-message").text("Analyzing...");

  setClass("loading");


  preview.loadAudio(audioFile, function(err){

    if (err) {
      d3.select("#row-audio").classed("error", true);
      setClass("error", "Error decoding audio file");
    } else {
      setClass(null);
    }

    d3.selectAll("#minimap, #submit").classed("hidden", !!err);

    if (!blob && audioFile.type.startsWith("video")) {
      $("#videoload a").attr("data-used", false);
      d3.select("#videoload").classed("hidden", false);
    }

  });

}


function txTimeUpdate() {
  var isValid = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])(:[0-5][0-9])?$/.test(this.value);
  $("#tx-search").attr("disabled", !isValid);
  this.style.backgroundColor = isValid ? null : "#fba";
}

function txGetDate(time) {
  var now = new Date();
      dateString = now.toDateString();
      inputString = dateString + " " + time;
      inputDate = new Date(inputString);
  if (now < inputDate) {
    inputDate.setTime(inputDate.getTime() - (24*60*60*1000));
  }
  return inputDate;
}

function txSearch() {
  setClass(null);
  var now = new Date(),
      min = now.getTime() - (12*60*60*1000),
      start = txGetDate($("#input-tx-start").val()),
      end = txGetDate($("#input-tx-end").val()),
      vpid = $("#input-tx-vpid").val();
  console.log(start);
  console.log(end);
  if (start.getTime() < min) {
    return setClass("error", "TX media is only available for the last 12 hours.");
  } else if (end.getTime() - start.getTime() > (15*60*1000)) {
    return setClass("error", "Please select a TX window < 15 minutes. If a larger window would be useful, please contact us.");
  }
  d3.select("#loading-message").text("Fetching " + vpid + " media from " + start.toLocaleString());
  setClass("loading");
  jQuery.post("/simulcast", {vpid: vpid, start: start.getTime()/1000, end: end.getTime()/1000})
        .fail(function(xhr, status, error) {
           setClass("error", status);
        })
        .done(function(data){
          console.log(data);
          if (data.error) {
            return setClass("error", data.error);
          }
          $("#videoload a").attr("data-src",data.video);
          $("#videoload a").attr("data-used", false);
          d3.select("#videoload").classed("hidden", data.video==null);
          txPoll(data.audio);
        });
}

function txPoll(url) {
    setClass("loading");
    jQuery.getJSON( url, function( data ) {
      console.log(data);
      if (data.ready===true) {
        if (data.type==="audio") {
          loadAudioFromURL(data.src);
        } else if (data.type==="video") {
          var blob = null;
          var xhr = new XMLHttpRequest(); 
          xhr.open("GET", data.src); 
          xhr.responseType = "blob";
          xhr.onload = function() {
            updateBackground(null, xhr.response);
          }
          xhr.send();
          console.log("LOAD VIDEO");
        }
      } else {
        txPollTimeout = setTimeout(function(){txPoll(url)},5000);
      }
    });
}

function vcsTranscript(id) {
  d3.select("#transcript").classed("loading", true);
  transcript.clear();
  $.getJSON( "/vcs/transcript/" + id, function( data ) {
    var statusCode = data.statusCode;
    if (statusCode==200) {
      var body = JSON.parse(data.body);
      var loaded = body.hasOwnProperty("commaSegments");
      if (loaded) {
        transcript.load(body);
        d3.select("#transcript").classed("loading", false);
      } else {
        vcsTranscriptTimeout = setTimeout(function(){vcsTranscript(id)},10000);
      }
    } else {
      console.log("VCS TRANSCRIPT ERROR");
      console.log(data);
    }
  });
}

function vcsAudio(url) {

  id = url.split("/").pop();

  d3.select("#loading-message").text("Fetching Audio...");
  setClass("loading");

  // Get aduio
  loadAudioFromURL("/vcs/media/" + id);

  // Get transcript
  clearTimeout(vcsTranscriptTimeout);
  vcsTranscript(id);

}

function vcsSearch(id, media) {

  var item = id || d3.select("#input-vcs").property("value");
  if (id) d3.select("#input-vcs").property("value", id);

  d3.select("#loading-message").text("Searching VCS...");
  setClass("loading");

  $.getJSON( "/vcs/search/" + item, function( data ) {
    var statusCode = data.statusCode;

    if (statusCode==200) {
      var items = JSON.parse(data.body);
      // Load audio
      vcsAudio(media || items[items.length - 1].mediaurl);
      // Write results
      d3.select("#vcs-results").html("");
      for (var i = items.length - 1; i >= 0; i--) {
        if (media) {
          var checked = (items[i].mediaurl.split("/").pop == media.split("/").pop) ? "checked" : null;
        } else {
          var checked = (i == items.length - 1) ? "checked" : null;
        }
        var disp = items[i].file.split("#").pop() + " [" + items[i].vcsinfo.take.GENERIC.GENE_LOGSTORE.split("$").pop() + "]";
        var option = "<div class='form-check'> <label class='form-check-label'> <input class='form-check-input' type='radio' name='vcs-item' value='" + items[i].mediaurl + "' " + checked + "> " + disp + " </label> </div>";
        d3.select("#vcs-results").insert("div").html(option).classed("error", false);
      }
    } else if (statusCode==404) {
      d3.select("#vcs-results").html("<b>That item wasn't found.</b><br/>Make sure your item is saved in a logstore that auto-exports to the S-drive.").classed("error", true);
    } else {
      d3.select("#vcs-results").html("<b>There was an error searching for that item.</b><br/>Check it was correctly formated, or try again.").classed("error", true);
    }

    if (statusCode!=200) setClass(null);

  }).fail(function(jqXHR, textStatus, errorThrown) {
    
    d3.select("#vcs-results").html("<b>An internal error occured.</b><br/>Please try again, or <a href='mailto:jonty.usborne@bbc.co.uk'>report the issue</a>.").classed("error", true);
    console.log(errorThrown);
    setClass(null);

  }).complete(function(){

    d3.select("#vcs-results").classed("hidden", false);

  });

}

function setBackground() {
  d3.select("#loading-message").text("Loading video...");
  setClass("loading");
  $("#videoload a").attr("data-used", true);
  var type = $("#sourceWrapper li.active a").attr("href").split("-").pop();
  if (type=="upload") {
    $("#input-background")[0].files = $("#input-audio")[0].files;
    setClass(null);
  } else if (type=="tx") {
    var src = $("#videoload a").attr("data-src");
    txPoll(src);
  }
  d3.select("#videoload").classed("hidden", true);
}

function updateBackground(event, blob) {

    d3.select("#row-background").classed("error", false);

    var upload = this;

    if ( blob===false || (blob===undefined && (!upload.files || !upload.files[0])) ) {
      preview.background(null);
      var input = jQuery("#input-background");
      input.replaceWith(input.val('').clone(true));
      setClass(null);
      return true;
    }

    backgroundFile = blob || this.files[0];

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
  var value = jQuery("#input-caption:visible").length ? jQuery("#input-caption").val() : "";
  preview.caption(value);
}

function updateTrim(extent) {
  extent = extent || [];
  var start = extent[0] || parseFloat(d3.select("#start").property("value"));
  var end = extent[1] || parseFloat(d3.select("#end").property("value"));
  if (!isNaN(start) && !isNaN(end)) {
    if (start>end){
      end = extent[0] || parseFloat(d3.select("#start").property("value"));
      start = extent[1] || parseFloat(d3.select("#end").property("value"));
    }
    var duration = Math.round(100*audio.duration())/100;
    start = start/duration;
    end = end/duration;
    minimap.drawBrush({start: start, end: end});
  }
}

function updateTheme() {
  var theme = d3.select(this.options[this.selectedIndex]).datum();
  preview.theme(theme);
  updateBackground();
  $("#videoload a[data-used=true]").parent().removeClass("hidden");
  // Reset custom config fields
  jQuery(".themeConfig").each(function() {
    if (this.name!="size") {
      // XXX hack to set subproperties (eg: theme.prop.subprob) without the use of `eval`. Need a nicer wary of doing it.
      prop = this.name.split(".");
      if (prop.length==1) {
        this.value = theme[prop[0]];
      } else if (prop.length==2) {
        this.value = theme[prop[0]][prop[1]];
      } else if (prop.length==3) {
        this.value = theme[prop[0]][prop[1]][prop[2]];
      }
    }
  });
  // Force sizes if theme doesn't support all of them
  jQuery("#input-size [data-orientation='landscape']").attr("disabled", (theme.backgroundImage && !theme.backgroundImage.landscape) || (theme.foregroundImage && !theme.foregroundImage.landscape) ? true : false);
  jQuery("#input-size [data-orientation='square']").attr("disabled", (theme.backgroundImage && !theme.backgroundImage.square) || (theme.foregroundImage && !theme.foregroundImage.square) ? true : false);
  jQuery("#input-size [data-orientation='portrait']").attr("disabled", (theme.backgroundImage && !theme.backgroundImage.portrait) || (theme.foregroundImage && !theme.foregroundImage.portrait) ? true : false);
  if (jQuery("#input-size option:selected").is(":disabled")) {
    jQuery("#input-size").val(jQuery("#input-size option:not(':disabled'):first").val());
  }
  // Reset wave sliders
  jQuery(".wave-slider[name=vertical]").slider("values", [ (theme.wave.y-(theme.wave.height/2))*100, (theme.wave.y+(theme.wave.height/2))*100 ]);
  jQuery(".wave-slider[name=horizontal]").slider("values", [ (theme.wave.x-(theme.wave.width/2))*100, (theme.wave.x+(theme.wave.width/2))*100 ]);
  // Reset subs sliders
  jQuery(".subs-slider[name=vertical]").slider("values", [theme.subtitles.margin.vertical*100]);
  jQuery(".subs-slider[name=horizontal]").slider("values", [theme.subtitles.margin.horizontal*100]);
  // Show options for settings not specified in theme
  d3.select("#row-background").classed("hidden", theme.raw.backgroundImage);
  d3.select("#row-wave").classed("hidden", theme.raw.wave);
  d3.select("#row-caption").classed("hidden", !theme.raw.caption);
  updateCaption();
  // Show all config options, if some are hidden
  d3.select("#row-theme").classed("advanced", jQuery("#section-theme > .row:not(:visible)").length);

}

function updateThemeConfig() {
  preview.themeConfig( this.name, (this.type=="checkbox" ? this.checked : this.value) );
  if (this.name=="subtitles.enabled") d3.select("#transcript-pane").classed("hidden", !this.checked);
}

function preloadImages(themes) {

  // preload images
  var themeQueue = d3.queue();

  d3.entries(themes).forEach(function(theme){

    if (!theme.value.name) {
      theme.value.name = theme.key;
    }

    if (theme.key !== "default") {
      themeQueue.defer(getImages, theme.value);
    }

  });

  themeQueue.awaitAll(initialize);

  function getImages(theme, cb) { //Q. where does this cb get passed in??

    if (!theme.backgroundImage && !theme.foregroundImage) {
      return cb(null, theme);
    }

    var imageQueue = d3.queue();

    // Load background images
    theme.backgroundImageFile = theme.backgroundImageFile || {};
    theme.backgroundImageInfo = theme.backgroundImageInfo || {};
    for(orientation in theme.backgroundImage){
      // Load each image
      imageQueue.defer(function(orientation, imgCb){
        theme.backgroundImageFile[orientation] = new Image();
        theme.backgroundImageFile[orientation].onload = function(){
          theme.backgroundImageInfo[orientation] = {type: "image", height: this.height, width: this.width};
          return imgCb(null);
        };
        theme.backgroundImageFile[orientation].onerror = function(e){
          console.warn(e);
          return imgCb(e);
        };
        theme.backgroundImageFile[orientation].src = "/settings/backgrounds/" + theme.backgroundImage[orientation];  //Q.  i thought there needs to be an explicit return statement.  or is this all side-effect making?
      }, orientation);
    }

    // Load foreground images
    theme.foregroundImageFile = theme.foregroundImageFile || {};
    for(orientation in theme.foregroundImage){
      // Load each image
      imageQueue.defer(function(orientation, imgCb){
        theme.foregroundImageFile[orientation] = new Image();
        theme.foregroundImageFile[orientation].onload = function(){
          return imgCb(null);
        };
        theme.foregroundImageFile[orientation].onerror = function(e){
          console.warn(e);
          return imgCb(e);
        };
        theme.foregroundImageFile[orientation].src = "/settings/backgrounds/" + theme.foregroundImage[orientation];  //Q.  i thought there needs to be an explicit return statement.  or is this all side-effect making?
      }, orientation);
    }

    // Finished loading this theme
    imageQueue.await(function(err){
      return cb(err, theme);
    });

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
    case "subtitles":
      return "Overlaying subtitles";
    case "ready":
      return "Cleaning up";
    default:
      return JSON.stringify(result);
  }

}
