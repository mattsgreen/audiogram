var fs = require("fs"),
    path = require("path"),
    Canvas = require("canvas"),
    getRenderer = require("../renderer/");

// Settings
var serverSettings = require("../lib/settings/");

function initializeCanvas(theme, cb) {

  // Fonts pre-registered in bin/worker
  var renderer = getRenderer(theme);

  var bgPath;
  if (!theme.customBackgroundPath && theme.backgroundImage) {
    bgPath = path.join(__dirname, "..", "settings", "backgrounds", theme.backgroundImage);
  } else {
    bgPath = path.join(serverSettings.storagePath, theme.customBackgroundPath);
  }

  // Load BBC watermark
  var dog = new Canvas.Image;
  dog.src = path.join(serverSettings.storagePath, "../editor/images/bbc.png");
  renderer.bbcDog(dog);

  // Load background image from file (done separately so renderer code can work in browser too)
  fs.readFile(bgPath, function(err, raw){
    if (err) {
      return cb(err);
    }

    var bg = new Canvas.Image;
    bg.src = raw;
    renderer.backgroundImage(bg);

    return cb(null, renderer);

  });

}

module.exports = initializeCanvas;
