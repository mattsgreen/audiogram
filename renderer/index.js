var d3 = require("d3"),
    patterns = require("./patterns.js"),
    subtitles = require("./subtitles.js"),
    captionRenderer = require("./caption.js");

module.exports = function(t) {

  var renderer = {},
      wrapText,
      foregroundImage,
      backgroundImage,
      bbcDog,
      theme;

  renderer.foregroundImage = function(_) {
    if (!arguments.length) return foregroundImage;
    foregroundImage = _;
    return this;
  };
  renderer.backgroundImage = function(_) {
    if (!arguments.length) return backgroundImage;
    backgroundImage = _;
    return this;
  };
  renderer.bbcDog = function(_) {
    if (!arguments.length) return bbcDog;
    bbcDog = _;
    return this;
  };

  renderer.theme = function(_) {
    if (!arguments.length) return theme;

    theme = _;

    // Default colors
    theme.backgroundColor = theme.backgroundColor || "#fff";
    theme.waveColor = theme.wave.color || theme.foregroundColor || "#000";
    theme.captionColor = theme.captionColor || theme.foregroundColor || "#000";

    // Default wave position/size
    if (typeof theme.wave.height !== "number") theme.wave.height = 0.25;
    if (typeof theme.wave.width !== "number") theme.wave.width = 1;
    if (typeof theme.wave.x !== "number") theme.wave.x = 0.5;
    if (typeof theme.wave.y !== "number") theme.wave.y = 0.5;

    // Convert wave to px
    theme.waveTop = (theme.wave.y * theme.height) - ((theme.wave.height * theme.height)/2);
    theme.waveBottom = theme.waveTop + (theme.wave.height * theme.height);
    theme.waveLeft = (theme.wave.x * theme.width) - ((theme.wave.width * theme.width)/2);
    theme.waveRight = theme.waveLeft + (theme.wave.width * theme.width);

    drawCaption = captionRenderer(theme);

    return this;
  };

  // Draw the frame
  renderer.drawFrame = function(context, options){

    context.patternQuality = "best";
    context.clearRect(0, 0, theme.width, theme.height);
    context.fillStyle = theme.backgroundColor;
    context.fillRect(0, 0, theme.width, theme.height);

    // BACKGROUND IMAGE
    if (backgroundImage && options.backgroundInfo) {

      var x, y,
          h, w, r,
          H, W, R;

      // Source dimensions
        h = options.backgroundInfo.height;
        w = options.backgroundInfo.width;
        r = w/h;

      // Target dimensions
        x = theme.backgroundPosition.x * theme.width;
        y = theme.backgroundPosition.y * theme.height;
        H = theme.backgroundPosition.height * theme.height;
        W = theme.backgroundPosition.width * theme.width;
        R = W/H;

      // Align/crop
        var sx = 0,
            sy = 0,
            swidth = w,
            sheight = h,
            width = W,
            height = H;

        if ( (R>1 && r<1) || (R>1 && r>1 && R>r) || (R==1 && r<1) || (R>1 && r==1) ) {
          swidth = w;
          sheight = w/R;
          if (theme.backgroundPosition.align.y=="bottom") {
            sy = (h-(w/R)); // bottom align
          } else if (theme.backgroundPosition.align.y!="top") {
            sy = (h-(w/R))/2; // middle align
          }
        } else if (r!==R) {
          // Horizontal align
          swidth = h*R;
          sheight = h;
          if (theme.backgroundPosition.align.x=="right") {
            sx = (w-(h*R)); // right align
          } else if (theme.backgroundPosition.align.x!="left") {
            sx = (w-(h*R))/2; // center align
          }
        }

      context.drawImage(backgroundImage, sx, sy, swidth, sheight, x, y, width, height);

    }


    // FOREGROUND IMAGE
    if (foregroundImage) {
      context.drawImage(foregroundImage, 0, 0, theme.width, theme.height);
    }
    
    // WAVE
    if (theme.pattern!="none") patterns[theme.pattern || "wave"](context, options.waveform, theme);

    // CAPTION
    if (options.caption) {
      drawCaption(context, options.caption);
    }

    // SUBTITLES
    if (theme.subtitles.enabled && options.transcript) {
      options.transcript.segments.forEach(function(segment, i){
        if (segment.words.length) {
          var start = segment.words[0].start,
          end = segment.words[segment.words.length-1].end,
          dur = end-start;
          // console.log("(" + i + ") - " + start + ", " + end + ", " + dur);
          if (dur<1) {
            var diff = 1 - dur;
            segment.words[0].start -= diff/2;
            segment.words[segment.words.length-1].end += diff/2;
            options.transcript.segments[i-1].words[options.transcript.segments[i-1].words.length-1].end -= diff/2;
            options.transcript.segments[i+1].words[0].start += diff/2;
          }
        }
      });
      var currentTime = options.frame / options.fps;
      subtitles.transcript(options.transcript);
      subtitles.draw(context, {
        theme: theme,
        time: currentTime,
        offset: options.start,
        end: options.end,
        preview: options.preview
      });
    }

    // BBC WATERMARK
    var A, h, w, o;
    A = 0.0075 * (theme.width*theme.height);
    h = Math.sqrt(A/3.5);
    w = h*3.5;
    o = h/1.5;
    context.drawImage(bbcDog, o, o, w, h);

    return this;

  };

  if (t) {
    renderer.theme(t);
  }

  return renderer;

}
