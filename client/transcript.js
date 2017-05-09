var jQuery = require("jquery"),
    ReactDOM = require('react-dom'),
    React = require('react'),
    TranscriptEditor = require('transcript-editor').default,
    Transcript = require('transcript-model').Transcript,
    currentTranscript,
    kaldiPoll;

// Attach listener to hightlight words during playback
  jQuery("audio").on("timeupdate", function(){
    jQuery(".transcript-editor-block__word").removeClass("played");
    if (!this.paused) {
      var currentTime = this.currentTime;
      jQuery(".transcript-editor-block__word").filter(function() {
        var wordStart = +jQuery(this).attr("data-start") + 0.1;
        return wordStart < currentTime;
      }).addClass("played");
    }
  });

// Format text to simulate line/page breaks
var reformat = false;
jQuery(document).on('keydown', '.transcript-editor', function(e){
  if (e.metaKey || e.ctrlKey) reformat = true;
});
jQuery(document).on('keyup', '.transcript-editor', function(e){
  if (reformat) {
    format();
    var preview = require("./preview.js");
    preview.redraw();
  }
  reformat = false;
});

// Move playhead when clicking on a word
  jQuery(document).on('click', '.transcript-editor-block__word', function(){
    var time = jQuery(this).attr("data-start");
    jQuery("audio").get(0).currentTime = time;
  });

// Make clip selection when highlighting transcript segments
  var selectionStart;
  jQuery(document).on('mousedown', '.public-DraftStyleDefault-block', function(){
    // Start selection on block whitespace
    if (!selectionStart){
      selectionStart = jQuery(this).parents("[data-block]").next().find(".transcript-editor-block__word:first");
    }
  }).on('mousedown', '.transcript-editor-block__space', function(){
    // Start selection on space between words
    if (!selectionStart){
      selectionStart = jQuery(this).prev();
    }
  }).on('mousedown', '.transcript-editor-block__word', function(){
    // Start selection on a word
    selectionStart = jQuery(this);
  }).on('mouseup', 'body *', function(){
    if (selectionStart) {
      var selectionEnd = null;
      if (jQuery(this).is(".transcript-editor-block__word *")) {
        // Finish selection on a word
        selectionEnd = jQuery(this).parents(".transcript-editor-block__word");
      } else if (jQuery(this).is(".transcript-editor-block__space *")){
        // Finish selection on a space
        selectionEnd = jQuery(this).parents(".transcript-editor-block__space").prev();
      } else if (jQuery(this).is(".public-DraftStyleDefault-block")) {
        // Finish selection on block whitespace
        selectionEnd = jQuery(this).find(".transcript-editor-block__word:last");
      }
      if (selectionEnd && selectionStart.get(0)!==selectionEnd.get(0)) {
        // If start/end points aren't the same
        var minimap = require('./minimap.js'),
        audio = require('./audio.js'),
        duration = Math.round(100*audio.duration())/100,
        start = +jQuery(selectionStart).attr("data-start"),
        end = +jQuery(selectionEnd).attr("data-end");
        if (start>end) {
          end = +jQuery(selectionStart).attr("data-start");
          start = +jQuery(selectionEnd).attr("data-end");
        } 
        if (!jQuery(this).is(".public-DraftStyleDefault-block") || end-start>1) {
          start = (start)/duration;
          end = (end)/duration;
          minimap.drawBrush({start: start, end: end});
          if (window.getSelection) {
            window.getSelection().removeAllRanges();
          } else if (document.selection) {
            document.selection.empty();
          }
        }
      }
    }
    selectionStart = null;
  });

// Highlight selected words 
  function highlight(start, end) {
    jQuery(".transcript-editor-block__word").removeClass("unused");
    if (start>=0 && end) {
      jQuery(".transcript-editor-block__word").filter(function() {
        var wordStart = jQuery(this).attr("data-start"),
            wordEnd = jQuery(this).attr("data-end"),
            wordMiddle = wordEnd - (wordEnd-wordStart)/2;
        return wordMiddle < start || wordStart > end;
      }).addClass("unused");
    }
  }


// Reformate line-breaks and speakers
jQuery(document).on("change","select.transcript-speaker",function(){
  format();
  var preview = require("./preview.js");
  preview.redraw();
})

  function format() {
    var currentJSON = toJSON();
    var maxChar = +jQuery("input[name='subtitles.lineWidth']").val(),
        maxLines = +jQuery("input[name='subtitles.linesMax']").val(),
        charCount = 0,
        lineCount = 1;
    // LINE BREAKS
      jQuery('.transcript-editor-block__space').removeClass("line-break").removeClass("page-break");
      jQuery( ".transcript-editor-block__text, .transcript-editor-block__word" ).each(function( index ) {
        if (jQuery(this).is('.transcript-editor-block__word')) {
          // Word (add to character count)
          var str = jQuery(this).text();
          charCount += str.length;
          if (charCount>maxChar) {
            // Simulate line-break before word
            var space = jQuery(this).prevAll(".transcript-editor-block__space:first");
            space.addClass("line-break");
            if (lineCount+1 > maxLines) {
              space.addClass("page-break");
              lineCount = 1;
            } else {
              lineCount++;
            }
            charCount = str.length;
          }
        } else {
          // New block, reset counters
          charCount = 0;
          lineCount = 1;
        }
      });

    // SPEAKER SELECTION
      // Reset
      jQuery('select.transcript-speaker').remove();
      jQuery( ".transcript-editor-block__speaker" ).show();
      // Count number of speakers
      var count = Math.max(speakerCount(), currentJSON ? currentJSON.speakers.length : 0);
      // Add dropdown for each block
      var block = 0;
      jQuery( ".transcript-editor-block__speaker" ).each(function( index ) {
        var speaker = jQuery(this),
            select = document.createElement("select");
        speaker.after(select);
        speaker.hide();
        jQuery(select).addClass("transcript-speaker")
        for (var i = 1; i <= count+1 ; i++) {
          var option = document.createElement("option");
          option.text = "Speaker " + i;
          select.appendChild(option);
        }
        // jQuery(select).val(jQuery(speaker).text());
        if ( jQuery( ".transcript-editor-block__speaker" ).length == currentJSON.segments.length ) {
          var index = currentJSON.segments[block].speaker;
        } else {
          var index = +speaker.text().split(" ").pop() - 1;
        }
        jQuery(select).prop('selectedIndex', index);
        if (jQuery("input[name='subtitles.color." + index + "']").length) {
          var color = jQuery("input[name='subtitles.color." + index + "']").val();
        } else {
          var preview = require("./preview.js"),
              theme = preview.theme();
          if (theme.subtitles.color[index]) {
            color = theme.subtitles.color[index];
          } else {
            color = theme.subtitles.color[0];
            preview.themeConfig("subtitles.color." + index, color);
          }
          var el = jQuery("input[name^='subtitles.color']:last").parent();
          el.after(el.clone());
          jQuery("input[name^='subtitles.color']:last").attr("name","subtitles.color." + index).val(color);
        }
        jQuery(select).next().css("border-color",color);
        block++;
      });
  }


function speakerCount() {
  var speakerCount = 1;
  jQuery( ".transcript-editor-block__speaker" ).each(function( index ) {
    var next = jQuery(this).next();
    if (next.is("select.transcript-speaker")) {
      var value = +next.val().split(" ").pop();
    } else {
      var value = +jQuery(this).text().split(" ").pop();
    }
    speakerCount = Math.max(speakerCount, value);
  });
  return speakerCount;
}

function toJSON() {
  if (!currentTranscript) return null;
  var json = currentTranscript.toJSON(),
      count = speakerCount(),
      speakers = [];
  // Add speakers
    for (var i = 0; i < count; i++) {
      speakers.push({name: null});
    }
    json.speakers = speakers;
  // Update block speakers
    var i = 0
    jQuery( "select.transcript-speaker" ).each(function( index ) {
      var value = +jQuery(this).val().split(" ").pop();
      if (json.segments[i]) json.segments[i].speaker = value - 1;
      i++;
    });
  return json;
}

function load(json) {

  if (!json) {
    return clear();
  }

  if (json.hasOwnProperty("commaSegments")) {
    currentTranscript = Transcript.fromComma(json);
  } else if (json.hasOwnProperty("kaldi")) {
    currentTranscript = Transcript.fromKaldi(json.transcript, json.segments);
  }

  var props = {
    transcript: currentTranscript,
    showSpeakers: true,
    onTranscriptUpdate: function(data){
      format();
      currentTranscript = data;
      var preview = require("./preview.js");
      preview.redraw();
    }
  };
  var TS = function() {
    return React.createElement(TranscriptEditor, props);
  };
  var transcriptElement = document.querySelector("transcript");
  ReactDOM.render(React.createElement(TS), transcriptElement, function(){
    setTimeout(format,1000);
  });

}

function clear() {
  jQuery("transcript").text("");
  currentTranscript = null;
  clearTimeout(kaldiPoll);
  return currentTranscript;
}

function poll(job) {

  kaldiPoll = setTimeout(function(){
    jQuery.getJSON( "/kaldi/" + job, function( data ) {
      if (data.status=="SUCCESS") {
        if (!data.error) {
          var transcript = JSON.parse(data.transcript),
              segments = JSON.parse(data.segments);
          load({transcript: transcript, segments: segments, kaldi: transcript.metadata.version});
        }
        jQuery("#transcript").removeClass("loading");
      } else {
        poll(job);
      }
    });
  }, 5000);

}

function generate(blob) {

  clear();
  
  var formData = new FormData();
  formData.append("audio",blob);

  jQuery.ajax({
    url: "/kaldi/",
    data: formData,
    cache: false,
    contentType: false,
    processData: false,
    type: 'POST',
    success: function(data){
      poll(data.job);
    }
  });

}

module.exports = {
  generate: generate,
  load: load,
  clear: clear,
  toJSON: toJSON,
  highlight: highlight,
  format: format
}
