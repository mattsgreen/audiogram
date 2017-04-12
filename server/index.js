// Dependencies
var express = require("express"),
    compression = require("compression"),
    path = require("path"),
    multer = require("multer"),
    uuid = require("node-uuid"),
    mkdirp = require("mkdirp"),
    bodyParser = require("body-parser"),
    auth = require('./auth.js');

// Routes and middleware
var whitelist = require("./whitelist.js"),
    logger = require("../lib/logger/"),
    render = require("./render.js"),
    status = require("./status.js"),
    fonts = require("./fonts.js"),
    whoami = require("./whoami.js"),
    kaldi = require("./kaldi.js"),
    vcs = require("./vcs.js"),
    simulcast = require("./simulcast.js"),
    errorHandlers = require("./error.js");

// Settings
var serverSettings = require("../lib/settings/");

var app = express();

// whitelist
const NODE_ENV = process.env.NODE_ENV ? process.env.NODE_ENV : "development" ;
const WHITELIST = require('../whitelist.json');
NODE_ENV === 'production' && app.use(auth(WHITELIST));
// NODE_ENV === app.use(auth(WHITELIST));

// use middlewares
app.use(compression());
app.use(logger.morgan());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Edit whitelist
app.get("/whitelist/get/", whitelist.get);
app.get("/whitelist/", whitelist.editor);
app.post("/whitelist/", whitelist.set);

// Options for where to store uploaded audio and max size
var fileOptions = {
  storage: multer.diskStorage({
    destination: function(req, file, cb) {

      var dir = path.join(serverSettings.workingDirectory, uuid.v1());

      mkdirp(dir, function(err) {
        return cb(err, dir);
      });
    },
    filename: function(req, file, cb) {
      cb(null, file.fieldname);
    }
  })
};

if (serverSettings.maxUploadSize) {
  fileOptions.limits = {
    fileSize: +serverSettings.maxUploadSize
  };
}

// On submission, check upload, validate input, and start generating a video
var filesToUpload = [{ name: 'audio', maxCount: 1 }, { name: 'background', maxCount: 1 }];
app.post("/submit/", [multer(fileOptions).fields(filesToUpload), render.validate, render.route]);

// If not using S3, serve videos locally
if (!serverSettings.s3Bucket) {
  app.use("/video/", express.static(path.join(serverSettings.storagePath, "video")));
}

// Serve custom fonts
app.get("/fonts/fonts.css", fonts.css);
app.get("/fonts/fonts.js", fonts.js);

if (serverSettings.fonts) {
  app.get("/fonts/:font", fonts.font);
}

// Get user info
app.get("/whoami/", whoami);

// Check the status of a current video
app.get("/status/:id/", status);

// Handle kaldi transcripts
app.post("/kaldi/", [multer(fileOptions).fields([{ name: 'audio', maxCount: 1 }]), kaldi.post]);
app.get("/kaldi/:job/", kaldi.get);

// VCS
app.get("/vcs/search/:id/", vcs.search);
app.get("/vcs/transcript/:id/", vcs.transcript);
app.get("/vcs/media/:id/", vcs.media);

// Get simulcast media
app.post("/simulcast/", simulcast.post);
app.get("/simulcast/media/:id/", simulcast.pipe);

// Serve background images and themes JSON statically
app.use("/settings/", function(req, res, next) {

  // Limit to themes.json and bg images
  if (req.url.match(/^\/?themes.json$/i) || req.url.match(/^\/?backgrounds\/[^/]+$/i)) {
    return next();
  }

  return res.status(404).send("Cannot GET " + path.join("/settings", req.url));

}, express.static(path.join(__dirname, "..", "settings")));

// Serve editor files statically
app.use(express.static(path.join(__dirname, "..", "editor")));

app.use(errorHandlers);

module.exports = app;
