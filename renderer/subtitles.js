
var nextStart = {i: 0, j: 0, time: 0},
    lines = [];

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

function draw(context, options) {

  var theme = options.theme,
      offset = options.offset,
      time = options.time + offset;

  nextStart.time = options.preview ? 0 : nextStart.time || offset;

    if (!transcript) {
      return;
    }

    if (options.preview || (time >= nextStart.time && options.end>nextStart.time) ) {
      lines = [];
      var line = 0,
          lineLength = 0,
          lineWidth = ifNumeric(theme.subtitles.lineWidth, 30); 
          linesMax = ifNumeric(theme.subtitles.linesMax, 2);

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
                  lines[line] = (lines[line] || "") + transcript.segments[i].words[j].text + " ";
                }
                if (j == transcript.segments[i].words.length - 1) {
                  break loopSegments;
                }
              }
            }
        }
        if (!options.preview) {
          nextStart = {
            i: i,
            j: j,
            time: transcript.segments[i] ? transcript.segments[i].words[j].start : options.end
          };
        }

    }

    // Format
    var ratio = { // Font sizes/spacing are relative to the default theme size, (1280x720), so scale accordingly
          width: theme.width/1280,
          height: theme.height/720
        },
        fontSize = theme.subtitles.fontSize * ratio.width,
        font = theme.subtitles.fontWeight + " " + fontSize + "px " + theme.subtitles.font,
        left = ifNumeric(theme.subtitles.left, 0, theme.width),
        right = ifNumeric(theme.subtitles.right, 1, theme.width),
        captionWidth = right - left,
        bottom = ifNumeric(theme.subtitles.bottom, null, theme.height),
        top = ifNumeric(theme.subtitles.top, null, theme.height);
    if (bottom === null && top === null) {
      top = 0;
    }

    var totalHeight = lines.length * (fontSize + (theme.subtitles.lineSpacing * ratio.width)),
        x = theme.subtitles.align === "left" ? left : theme.subtitles.align === "right" ? right : (left + right) / 2,
        y;

    if (top !== null && bottom !== null) {
      // Vertical center
      y = (bottom + top - totalHeight) / 2;
    } else if (bottom !== null) {
      // Vertical align bottom
      y = bottom - totalHeight;
    } else {
      // Vertical align top
      y = top;
    }

    context.font = font;
    context.textBaseline = "top";
    context.textAlign = theme.subtitles.align || "center";
    lines.forEach(function(text, i){
      var lineY = y + i * (fontSize + (theme.subtitles.lineSpacing * ratio.width))
      if (theme.subtitles.stroke) {
        context.strokeStyle = theme.subtitles.stroke.color;
        context.lineWidth = theme.subtitles.stroke.width * ratio.width;
        context.strokeText(text, x, lineY);
      }
      context.fillStyle = theme.subtitles.color;
      context.fillText(text, x, lineY);
    });

 }


module.exports = {
  draw: draw,
  nextStart: _nextStart,
  transcript: _transcript
}
