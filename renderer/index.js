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

    // Draw the background image and/or background color
    context.clearRect(0, 0, theme.width, theme.height);

    context.fillStyle = theme.backgroundColor;
    context.fillRect(0, 0, theme.width, theme.height);

    if (backgroundImage && options.backgroundInfo) {
      var h, w, r,
          H, W, R;
      // Source dimensions
      h = options.backgroundInfo.height;
      w = options.backgroundInfo.width;
      r = w/h;
      // Target dimensions
      H = theme.height;
      W = theme.width;
      R = W/H;
      // Draw
      if (r===R) {
        context.drawImage(backgroundImage, 0, 0, W, H);
      // } else if ( (R>1 && r<1) || (R<1 && r>1) || (R==1 && r<1) ) {
      } else if ( (R>1 && r<1) || (R>1 && r>1 && R>r) || (R==1 && r<1) ) {
        // Vertical align
        if (theme.cropAnchor.y=="top") {
          context.drawImage(backgroundImage, 0, 0, w, (w/R), 0, 0, W, H);
        } else if (theme.cropAnchor.y=="bottom") {
          context.drawImage(backgroundImage, 0, (h-(w/R))/2, w, (w/R), 0, 0, W, H);
        } else {
          context.drawImage(backgroundImage, 0, (h-(w/R)), w, (w/R), 0, 0, W, H);
        }
      } else {
        // Horizontal align
        if (theme.cropAnchor.x=="left") {
          context.drawImage(backgroundImage, 0, 0, (h*R), h, 0, 0, W, H);
        } else if (theme.cropAnchor.x=="right") {
          context.drawImage(backgroundImage, (w-(h*R)), 0, (h*R), h, 0, 0, W, H);
        } else {
          context.drawImage(backgroundImage, (w-(h*R))/2, 0, (h*R), h, 0, 0, W, H);
        }
      }
    }

    // Draw foreground image
    if (foregroundImage) {
      context.drawImage(foregroundImage, 0, 0, theme.width, theme.height);
    }

    // Overlay BBC watermark
    var A, h, w, o;
    A = 0.0075 * (theme.width*theme.height);
    h = Math.sqrt(A/3.5);
    w = h*3.5;
    o = h/1.5;
    context.drawImage(bbcDog, o, o, w, h);

    if (theme.pattern!="none") patterns[theme.pattern || "wave"](context, options.waveform, theme);

    // Write the caption
    if (options.caption) {
      drawCaption(context, options.caption);
    }

    // Write subtitles
    if (theme.subtitles.enabled && options.transcript) {
      var currenTime = options.frame / options.fps;
      subtitles.transcript(options.transcript);
      subtitles.draw(context, {
        theme: theme,
        time: currenTime,
        offset: options.start,
        end: options.end,
        preview: options.preview
      });
    }

    return this;

  };

  if (t) {
    renderer.theme(t);
  }

  return renderer;

}
