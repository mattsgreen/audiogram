function combineFrames(options, cb) {

  function run(args, callback) {
    var err;
    var spawn = require("child_process").spawn;
    var command = spawn("ffmpeg", args);
    command.stderr.on('data', function(data) {
      err = "combineFrames - ffmpeg error: " + data;
    });
    command.on('exit', function() {
      return callback(err);
    });
  }
  
  // Raw ffmpeg command with standard mp4 setup
  // Some old versions of ffmpeg require -strict for the aac codec
  var args = [
    '-loglevel', 'fatal',
    '-r', options.framesPerSecond,
    '-i', options.framePath,
    '-i', options.audioPath,
    '-c:v', 'libx264',
    '-c:a', 'aac',
    '-strict', 'experimental',
    '-shortest',
    '-pix_fmt', 'yuv420p', options.videoPath
  ];
  run(args, function(err){cb(err)});

}

module.exports = combineFrames;