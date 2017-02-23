var serverSettings = require("../lib/settings/"),
    formatting = require("../lib/formatting.js");

module.exports = function(err, req, res, next) {

  console.log("RLW in error handler: " + err.code + " / " + err.name + " / " + err.message);

  if (!err) {

    // This should never happen
    return next ? next() : null;

  }

  res.status(500);

  if (err.code === "LIMIT_FILE_SIZE") {
    res.send("Sorry, uploads are limited to " + formatting.prettySize(serverSettings.maxUploadSize) + ". Try clipping your file or converting it to an MP3.");
  } else {
    res.send("Unknown error.");
    throw err;
  }

};
