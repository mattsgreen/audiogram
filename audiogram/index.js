var path = require("path"),
    queue = require("d3").queue,
    mkdirp = require("mkdirp"),
    rimraf = require("rimraf"),
    serverSettings = require("../lib/settings/"),
    transports = require("../lib/transports/"),
    logger = require("../lib/logger/"),
    Profiler = require("../lib/profiler.js"),
    probe = require("../lib/probe.js"),
    getWaveform = require("./waveform.js"),
    initializeCanvas = require("./initialize-canvas.js"),
    drawFrames = require("./draw-frames.js"),
    subtitles = require("../renderer/subtitles.js"),
    combineFrames = require("./combine-frames.js"),
    backgroundVideo = require("./background-video.js"),
    trimAudio = require("./trim.js");

function Audiogram(id) {

  // Unique audiogram ID
  this.id = id;
  this.set("id",id);

  // File locations to use
  this.dir = path.join(serverSettings.workingDirectory, this.id);

  this.audioPath = path.join(this.dir, "audio");
  this.backgroundPath = path.join(this.dir, "background");
  this.backgroundFrameDir = path.join(this.dir, "backgroundFrames");
  this.videoPath = path.join(this.dir, "video.mp4");
  this.frameDir = path.join(this.dir, "frames");

  this.profiler = new Profiler();

  return this;

}

// Get the waveform data from the audio file, split into frames
Audiogram.prototype.getWaveform = function(cb) {

  var self = this;

  this.status("probing");

  probe(this.audioPath, function(err, data){

    if (err) {
      return cb(err);
    }

    if (self.settings.theme.maxDuration && self.settings.theme.maxDuration < data.duration) {
      return cb("Exceeds max duration of " + self.settings.theme.maxDuration + "s");
    }

    self.profiler.size(data.duration);
    self.set("numFrames", self.numFrames = Math.floor(data.duration * self.settings.theme.framesPerSecond));
    self.status("waveform");

    getWaveform(self.audioPath, {
      numFrames: self.numFrames,
      samplesPerFrame: self.settings.theme.samplesPerFrame,
      channels: data.channels
    }, function(waveformErr, waveform){

      return cb(waveformErr, self.waveform = waveform);

    });


  });

};

// Trim the audio by the start and end time specified
Audiogram.prototype.trimAudio = function(start, end, cb) {

  var self = this;

  this.status("trim");

  // FFmpeg needs an extension to sniff
  var trimmedPath = this.audioPath + "-trimmed.mp3";

  trimAudio({
    origin: this.audioPath,
    destination: trimmedPath,
    startTime: start,
    endTime: end
  }, function(err){
    if (err) {
      return cb(err);
    }

    self.audioPath = trimmedPath;

    return cb(null);
  });

};

// Process background video
Audiogram.prototype.backgroundVideo = function(cb) {

  var self = this;

  this.status("video");

  backgroundVideo({
    origin: path.join(serverSettings.storagePath, this.settings.theme.customBackgroundPath),
    destination: this.backgroundFrameDir,
    duration: this.settings.duration
  }, function(err,fps){
    if (err) {
      return cb(err);
    }
    self.settings.backgroundInfo.frames = Math.ceil(fps * self.settings.backgroundInfo.duration);
    self.settings.theme.framesPerSecond = fps;
    return cb(null);
  });

};

// Initialize the canvas and draw all the frames
Audiogram.prototype.drawFrames = function(cb) {

  var self = this;

  this.status("renderer");

  initializeCanvas(this.settings.theme, function(err, renderer){

    if (err) {
      return cb(err);
    }

    self.status("frames");

    drawFrames(renderer, {
      width: self.settings.theme.width,
      height: self.settings.theme.height,
      numFrames: self.numFrames,
      frameDir: self.frameDir,
      backgroundFrameDir: self.backgroundFrameDir,
      caption: self.settings.caption,
      transcript: JSON.parse(self.settings.transcript),
      waveform: self.waveform,
      fps: self.settings.theme.framesPerSecond,
      start: self.settings.start,
      end: self.settings.end,
      backgroundInfo: self.settings.backgroundInfo,
      tick: function() {
        transports.incrementField(self.id, "framesComplete");
      }
    }, cb);

  });

};

// Save subtitles
Audiogram.prototype.saveSubtitles = function(type,cb) {

  var self = this;

  console.log("generate subtitles: " + type);

  if (self.settings.transcript) {
    subtitles.save(type, path.join(self.dir, "subtitles." + type), function(err){
      if (err) return cb(err);
      transports.uploadVideo(path.join(self.dir, "subtitles." + type), "video/" + self.id + "." + type, function(err){
        return cb(err);
      });
    });
  }

};

// Save thumbnail image
Audiogram.prototype.saveThumb = function(cb) {

  var self = this;
  
  transports.uploadVideo(path.join(self.frameDir, "000001.jpg"), "video/" + self.id + ".jpg", function(err){
    return cb(err);
  });

};

// Combine the frames and audio into the final video with FFmpeg
Audiogram.prototype.combineFrames = function(cb) {

  this.status("combine");

  combineFrames({
    framePath: path.join(this.frameDir, "%06d.jpg"),
    audioPath: this.audioPath,
    videoPath: this.videoPath,
    framesPerSecond: this.settings.theme.framesPerSecond
  }, cb);

};

// Master render function, queue up steps in order
Audiogram.prototype.render = function(cb) {

  var self = this,
      q = queue(1);

  this.status("audio-download");

  // Set up tmp directory
  q.defer(mkdirp, this.frameDir);

  // Download the stored audio file
  q.defer(transports.downloadAudio, "audio/" + this.id, this.audioPath);

  // If the audio needs to be clipped, clip it first and update the path
  if (this.settings.start || this.settings.end) {
    q.defer(this.trimAudio.bind(this), this.settings.start || 0, this.settings.end || null);
  }

  // Process background video
  this.settings.backgroundInfo = JSON.parse(this.settings.backgroundInfo);
  if (this.settings.backgroundInfo.type.startsWith("video")) {
    q.defer(mkdirp, this.backgroundFrameDir);
    q.defer(this.backgroundVideo.bind(this));
  }

  // Get the audio waveform data
  q.defer(this.getWaveform.bind(this));

  // Draw all the frames
  q.defer(this.drawFrames.bind(this));

  // Save subtitle files
  q.defer(this.saveSubtitles.bind(this), "srt");
  q.defer(this.saveSubtitles.bind(this), "xml");

  // Save preview thumnail
  q.defer(this.saveThumb.bind(this));

  // Combine audio and frames together with ffmpeg
  q.defer(this.combineFrames.bind(this));

  // Upload video to S3 or move to local storage
  q.defer(transports.uploadVideo, this.videoPath, "video/" + this.id + ".mp4");

  // Delete working directory
  // q.defer(rimraf, this.dir);
  // TO DO: also need to remove bg directory

  // Final callback, results in a URL where the finished video is accessible
  q.await(function(err){

    if (!err) {
      self.set("url", transports.getURL(self.id));
    }

    logger.debug(self.profiler.print());

    return cb(err);

  });

  return this;

};

Audiogram.prototype.set = function(field, value) {
  logger.debug(field + "=" + value);
  transports.setField(this.id, field, value);
  return this;
};

// Convenience method for .set("status")
Audiogram.prototype.status = function(value) {
  this.profiler.start(value);
  return this.set("status", value);
};

module.exports = Audiogram;
