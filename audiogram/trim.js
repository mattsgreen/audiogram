var probe = require("../lib/probe.js");

function trimAudio(options, cb) {

  if (!options.endTime) {

    return probe(options.origin, function(err, data){
      if (err) {
        return cb(err);
      }

      options.endTime = data.duration;
      trimAudio(options, cb);

    });

  }

  function run(args, callback) {
    var err;
    var spawn = require("child_process").spawn;
    var command = spawn("ffmpeg", args);
    command.stderr.on('data', function(data) {
      err = "trimAudio - ffmpeg error: " + data;
    });
    command.on('exit', function() {
      return callback(err);
    });
  }

  var args = [
    '-loglevel', 'error',
    '-i', options.origin,
    '-ss', (options.startTime || 0),
    '-t', (options.endTime - options.startTime),
    '-acodec', 'libmp3lame',
    '-b:a', '128k',
    options.destination
  ];
  run(args, function(err){cb(err)});

}

module.exports = trimAudio;