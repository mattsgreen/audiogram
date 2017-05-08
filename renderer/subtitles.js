
var nextStart = {i: 0, j: 0, time: 0},
    lines = [],
    srt = [];

function _srt(_) {
  return arguments.length ? (srt = _) : srt;
}

function _transcript(_) {
  return arguments.length ? (transcript = _) : transcript;
}

function _nextStart(_) {
  return arguments.length ? (nextStart = _) : nextStart;
}

function ifNumeric(val, alt, ratio) {
  ratio = ratio || 1;
  return (typeof val === "number" && !isNaN(val)) ? val*ratio : alt;
}

function save(type, path, cb) {

  var fs = require('fs'),
      sub = "";

  if (type=="srt"){
    // SRT
      var i = 1;
      for (var key in srt){
          sub += i + "\n";
          sub += key + "\n";
          sub += srt[key] + "\n\n";
          i++;
      }
    } else if (type=="xml") {
      // EBU-TT-D
        var sub = '<?xml version="1.0"?> <tt xmlns="http://www.w3.org/2006/10/ttaf1" xmlns:st="http://www.w3.org/ns/ttml#styling" xml:lang="eng" ';
        // TODO: Add tts:extent to size subs properly on square/vertical video
        // sub += 'tts:extent=""';
        sub += '> <head> <styling> <style id="backgroundStyle" st:fontFamily="proportionalSansSerif" st:fontSize="18px" st:textAlign="center" st:backgroundColor="rgba(0,0,0,0)" st:displayAlign="center"/> </styling> <layout/> </head> <body> <div>';
        for (var key in srt){
            var timing = key.split(" --> "),
                begin = timing[0].split(",").shift(),
                end = timing[1].split(",").shift();
            sub += '<p begin="' + begin + '" end="' + end + '">';
            sub += srt[key].replace("\n","<br/>");
            sub += '</p>';
        }
        sub += '</div> </body> </tt>';
    } else {
      return cb("Unsupported subtitle format");
    }

    fs.writeFile(path, sub, function(err){
      err = err ? "Error saving subtitle file: " + err : null;
      return cb(err);
    });

}

function draw(context, options) {

  var theme = options.theme,
      offset = options.offset,
      time = options.time + offset,
      times = [];

  nextStart.time = options.preview ? 0 : nextStart.time || offset;

    if (!transcript) {
      return;
    }

    if (options.preview || (time >= nextStart.time && options.end>nextStart.time) ) {
      lines = [];
      var line = 0,
          lineLength = 0,
          lineWidth = ifNumeric(+theme.subtitles.lineWidth, 30); 
          linesMax = ifNumeric(+theme.subtitles.linesMax, 2);

      // Split text into lines
      loopSegments:
        for (var i = nextStart.i; i < transcript.segments.length; i++) {
          loopWords:
            for (var j = nextStart.j; j < transcript.segments[i].words.length; j++) {
              nextStart.j = 0;
              if (transcript.segments[i].words[j].end > options.end) {
                break loopSegments;
              }
              var wordStart = transcript.segments[i].words[j].start,
                  wordEnd = transcript.segments[i].words[j].end,
                  wordMid = wordStart + (wordEnd - wordStart)/2;
              if (wordMid >= offset) {
                wordLength = transcript.segments[i].words[j].text.length;
                lineLength += wordLength;
                if ( lineLength>lineWidth && (line+2)>linesMax ) {
                  break loopSegments;
                } else if (lineLength>lineWidth) {
                  // Move to new line
                  line++;
                  lineLength = wordLength;
                }
                if (transcript.segments[i].words[j].text) {
                  // Add word
                  lines[line] = (lines[line] || "") + transcript.segments[i].words[j].text + " ";
                  times.push({start: wordStart-offset, end: wordEnd-offset});
                  // console.log("times.length: " + times.length);
                }
                if (j == transcript.segments[i].words.length - 1) {
                  i++;
                  j=0;
                  break loopSegments;
                }
              }
            }
        }
        if (!options.preview) {
          nextStart = {
            i: i,
            j: j,
            time: transcript.segments[i] ?  transcript.segments[i].words[j] ? transcript.segments[i].words[j].start : options.end : options.end
          };
        }

    }

    // Format
    if (theme.subtitles.fontWeight=="Regular") theme.subtitles.fontWeight = ""; 
    var ratio = { // Font sizes/spacing are relative to the default theme size, (1280x720), so scale accordingly
          width: theme.width/1280,
          height: theme.height/720
        },
        fontSize = theme.subtitles.fontSize * ratio.width,
        font = fontSize + "px '" + theme.subtitles.font + theme.subtitles.fontWeight + "'",
        left = ifNumeric(theme.subtitles.left, 0, theme.width),
        right = ifNumeric(theme.subtitles.right, 1, theme.width),
        captionWidth = right - left,
        horizontal = ifNumeric(+theme.subtitles.margin.horizontal, 0.5, theme.width),
        vertical = ifNumeric(+theme.subtitles.margin.vertical, 0.5, theme.height),
        spacing = theme.subtitles.lineSpacing;

    var totalHeight = lines.length * (fontSize + (spacing * ratio.width)),
        x = horizontal,
        // x = theme.subtitles.align === "left" ? left : theme.subtitles.align === "right" ? right : (left + right) / 2,
        y;

    if (theme.subtitles.valign=="top") {
      y = vertical;
    } else if (theme.subtitles.valign=="bottom") {
      y = vertical - totalHeight;
    } else {
      y = vertical - totalHeight/2;
    }

    // Draw background box
    if (lines.length && theme.subtitles.box && theme.subtitles.box.opacity>0) {
      context.globalAlpha = theme.subtitles.box.opacity;
      context.fillStyle = theme.subtitles.box.color || "#000000";
      context.fillRect(0, y-spacing, theme.width, totalHeight+spacing*3);
      context.globalAlpha = 1;
    }

    context.font = font;
    context.textBaseline = "top";
    context.textAlign = theme.subtitles.align || "center";
    lines.forEach(function(text, i){
      var lineY = y + i * (fontSize + (spacing * ratio.width))
      if (theme.subtitles.stroke && theme.subtitles.stroke.width>0) {
        context.strokeStyle = theme.subtitles.stroke.color;
        context.lineWidth = theme.subtitles.stroke.width * ratio.width;
        context.strokeText(text, x, lineY);
      }
      context.fillStyle = theme.subtitles.color;
      context.fillText(text, x, lineY);
    });

    // Generate Subtile File
    if (times.length>0) {
      function timeFormat(t) {
        t = Number(t);
        var h = Math.floor(t / 3600),
            m = Math.floor(t % 3600 / 60),
            s = (t % 3600 % 60).toFixed(2),
            string = `00${h}`.slice(-2) + ":" + `00${m}`.slice(-2) + ":" + `00${s}`.slice(-5);
        return string.replace(".",",");
      }
      var key = timeFormat(times[0].start) + " --> " + timeFormat(times[times.length-1].end);
      srt[key] = lines.join("\n");
    }

 }


module.exports = {
  draw: draw,
  nextStart: _nextStart,
  transcript: _transcript,
  save: save
}
