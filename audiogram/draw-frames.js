var fs = require("fs"),
    path = require("path"),
    Canvas = require("canvas"),
    queue = require("d3").queue;

function drawFrames(renderer, options, cb) {

  var frameQueue = queue(10),
      canvases = [];

  for (var i = 0; i < 10; i++) {
    canvases.push(new Canvas(options.width, options.height));
  }

  for (var i = 0; i < options.numFrames-2; i++) {
    frameQueue.defer(drawFrame, i);
  }

  frameQueue.awaitAll(cb);

  function loadVideoFrame(options, frameNumber, imgCb) {
      if (options.backgroundInfo.type.startsWith("video")) {
        // If we're using a background video, load the respective frame still as background iamge
        var bgFrame = (frameNumber + 1) % options.backgroundInfo.frames || options.backgroundInfo.frames;
        var bg = new Canvas.Image;
        bg.onload = function(){
          renderer.backgroundImage(bg);
          return imgCb(null);
        };
        bg.onerror = function(e){
          return imgCb(e);
        };
        var frameSrc = path.join(options.backgroundFrameDir, "/" + zeropad(bgFrame, 6) + ".png");
        var i = 1;
        function addSrc() {
          // Wait for frame to exist (async ffmpeg process for making frames sometimes takes too long)
          if (fs.existsSync(frameSrc)) {
            bg.src = frameSrc;
            return;
          } else if (i<30) {
            setTimeout(addSrc,2000);
          } else {
            return imgCb("Background video frame not loaded in time (" + frameSrc + ")");
          }
          i++;
        }
        addSrc();
      } else {
        return imgCb(null);
      }
  }

  function drawFrame(frameNumber, frameCallback) {

    var drawQueue = queue(1);

    var canvas = canvases.pop(),
        context = canvas.getContext("2d");

    drawQueue.defer(loadVideoFrame, options, frameNumber);

    drawQueue.await(function(err){
      if (err) {
        return cb(err);
      }

      renderer.drawFrame(context, {
        caption: options.caption,
        transcript: options.transcript,
        waveform: options.waveform[frameNumber],
        backgroundInfo: options.backgroundInfo,
        start: options.start,
        end: options.end,
        fps: options.fps,
        frame: frameNumber
      });

      var out = fs.createWriteStream(path.join(options.frameDir, zeropad(frameNumber + 1, 6) + ".jpg"));
      var stream = canvas.createJPEGStream({
        bufsize: 2048,
        quality: 80
      });
      stream.pipe(out);
      out.on('finish', function(){
        if (options.tick) {
          options.tick();
        }
        canvases.push(canvas);
        return frameCallback(null);
      });

    });

  }

}

function zeropad(str, len) {

  str = str.toString();

  while (str.length < len) {
    str = "0" + str;
  }

  return str;

}

module.exports = drawFrames;
