var d3 = require("d3"),
    patterns = require("./patterns.js"),
    textWrapper = require("./text-wrapper.js");

module.exports = function(t) {

  var renderer = {},
      backgroundImage,
      bbcDog,
      wrapText,
      theme;

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
    theme.waveColor = theme.waveColor || theme.foregroundColor || "#000";
    theme.captionColor = theme.captionColor || theme.foregroundColor || "#000";

    // Default wave dimensions
    if (typeof theme.waveTop !== "number") theme.waveTop = 0;
    if (typeof theme.waveBottom !== "number") theme.waveBottom = theme.height;
    if (typeof theme.waveLeft !== "number") theme.waveLeft = 0;
    if (typeof theme.waveRight !== "number") theme.waveRight = theme.width;

    wrapText = textWrapper(theme);

    return this;
  };

  // Draw the frame
  renderer.drawFrame = function(context, options){

    context.patternQuality = "best";

    // Draw the background image and/or background color
    context.clearRect(0, 0, theme.width, theme.height);

    context.fillStyle = theme.backgroundColor;
    context.fillRect(0, 0, theme.width, theme.height);

    if (backgroundImage) {
      let h, w, r,
          H, W, R;
      // Source dimensions
      h = options.backgroundImageSize.height;
      w = options.backgroundImageSize.width;
      r = w/h;
      // Target dimensions
      H = theme.height;
      W = theme.width;
      R = W/H;
      // Draw
      if (r===R) {
        context.drawImage(backgroundImage, 0, 0, W, H);
      } else if ( (R>r && r>1) || (R<r && r<=1) ) {
        context.drawImage(backgroundImage, 0, (h-(w/R))/2, w, (w/R), 0, 0, W, H); // Crop & vertical align
      } else {
        context.drawImage(backgroundImage, (w-(h*R))/2, 0, (h*R), h, 0, 0, W, H); // Crop & horizontal align
      }
    }

    // Overlay BBC watermark
    let A, h, w, o;
    A = 0.0075 * (theme.width*theme.height);
    h = Math.sqrt(A/3.5);
    w = h*3.5;
    o = h/1.5;
    context.drawImage(bbcDog, o, o, w, h);

    patterns[theme.pattern || "wave"](context, options.waveform, theme);

    // Write the caption
    if (options.caption) {
      wrapText(context, options.caption === "undefined" ? "" : options.caption);
    }

    return this;

  };

  if (t) {
    renderer.theme(t);
  }

  return renderer;

}
