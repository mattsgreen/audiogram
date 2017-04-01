var serverSettings = require("../lib/settings/"),
    spawn = require("child_process").spawn,
    path = require("path"),
    _ = require("underscore"),
    logger = require("../lib/logger"),
    transports = require("../lib/transports");

function validate(req, res, next) {

  console.log("RLW validating");

  try {

    req.body.theme = JSON.parse(req.body.theme);

  } catch(e) {

    return res.status(500).send("Unknown settings error.");

  }

  var audioFile = req.files['audio'][0]
  if (!audioFile || !audioFile.filename) {
    return res.status(500).send("No valid audio received.");
  }

  // Start at the beginning, or specified time
  if (req.body.start) {
    req.body.start = +req.body.start;
  }

  if (req.body.end) {
    req.body.end = +req.body.end;
  }

  return next();

}

function route(req, res) {

  console.log("RLW routing");


  if (req.files['background']) {
    var backgroundFile = req.files['background'][0],
        backgroundId = backgroundFile.destination.split(path.sep).pop(),
        backgroundImagePath = "background/" + backgroundId;
    transports.uploadBackground(path.join(backgroundFile.destination, "background"), backgroundImagePath, function(err) {
      if (err) {
        throw err;
      }
    });
  }

  var audioFile = req.files['audio'][0],
      audioId = audioFile.destination.split(path.sep).pop();
  transports.uploadAudio(path.join(audioFile.destination, "audio"), "audio/" + audioId, function(err) {

    if (err) {
      console.log("RLW routing err");
      throw err;
    }

    // Queue up the job with a timestamp
    var themeWithBackgroundImage =  _.extend(req.body.theme, { customBackgroundPath: backgroundImagePath });
    transports.addJob(_.extend({ id: audioId, created: (new Date()).getTime(), theme: themeWithBackgroundImage }, req.body));

    res.json({ id: audioId });

    // If there's no separate worker, spawn one right away
    if (!serverSettings.worker) {

      logger.debug("Spawning worker");

      // Empty args to avoid child_process Linux error
      spawn("bin/worker", [], {
        stdio: "inherit",
        cwd: path.join(__dirname, ".."),
        env: _.extend({}, process.env, { SPAWNED: true })
      });

    }

  });

};

module.exports = {
  validate: validate,
  route: route
};
