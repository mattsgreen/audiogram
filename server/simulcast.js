var vpids = require('./simulcast_vpids.json'),
	request = require('request'),
	reith = "http://www-cache.reith.bbc.co.uk:80",
	requestProxy = request.defaults({'proxy':'www-cache.reith.bbc.co.uk:80'}),
	concat = require('concat-files'),
    fs = require("fs"),
    uuid = require('uuid/v4'),
    xmlParser = require('xml2json'),
    mkdirp = require("mkdirp"),
    path = require("path"),
    queue = require("d3").queue;

var q,
	job,
	tmpPath,
	mpd,
	segmentDuration,
	mediaURL;

function getMpd(vpid,cb) {
	// Query MS for a MPD url
	var requestURL = "http://open.live.bbc.co.uk/mediaselector/5/select/version/2.0/mediaset/pc/vpid/" + vpid + "/format/json/";
	request({url: requestURL, proxy: reith}, function (err, response, body) {
		if (err) return cb(err);
		mpd = null;
		var ms = JSON.parse(body);
		if (!ms.media) {
			return cb("Invalid vpid");
		}
		var connections = ms.media[ms.media.length-1].connection,
			href = null;
		for (var i = 0; i < connections.length; i++) {
			if (connections[i].protocol==="http" && connections[i].transferFormat==="dash") {
				href = connections[i].href;
				break;
			}
		}
		if (!href) return cb("No available http dash connections");
		// Get the MPD itself
		request({url: href, proxy: reith}, function (err, response, body) {
			if (err) return cb(err);
			var json = xmlParser.toJson(body);
			mpd = JSON.parse(json);
			cb(null);
		});
	});
}

function mpdParse(cb) {
	if (!mpd.MPD.Period.AdaptationSet.length) {
	 	mpd.MPD.Period.AdaptationSet[0] = mpd.MPD.Period.AdaptationSet;
	 	mpd.MPD.Period.AdaptationSet.length = 1;
	}
	segmentDuration = mpd.MPD.Period.AdaptationSet[0].SegmentTemplate.duration / mpd.MPD.Period.AdaptationSet[0].SegmentTemplate.timescale;
 	mediaURL = {init: {}, template:{}};
 	var baseURL = mpd.MPD.BaseURL.$t;
 	for (var i = 0; i < mpd.MPD.Period.AdaptationSet.length; i++) {
 		var type = mpd.MPD.Period.AdaptationSet[i].contentType;
 		if (mpd.MPD.Period.AdaptationSet[i].Representation.length>1){
 			var repID = mpd.MPD.Period.AdaptationSet[i].Representation[mpd.MPD.Period.AdaptationSet[i].Representation.length-1].id;
 		} else {
 			var repID = mpd.MPD.Period.AdaptationSet[i].Representation.id;
 		}
 		mediaURL.init[type] = baseURL + mpd.MPD.Period.AdaptationSet[i].SegmentTemplate.initialization.replace("$RepresentationID$",repID);
 		mediaURL.template[type] = baseURL + mpd.MPD.Period.AdaptationSet[i].SegmentTemplate.media.replace("$RepresentationID$",repID);
 	}
 	return cb(null);
}

function fetchSegment(url, filename, cb) {
	var ws = fs.createWriteStream(filename);
	ws.on('finish', function(err) {
		cb(err);
	});
	request({url: url, proxy: reith}).pipe(ws);
}

function cat(files, dest, cb) {
	concat(files, dest, function(err) {
		cb(err);
		// Delete the files now we've finished with them
		for (var i = 0; i < files.length; i++) {
			if (fs.existsSync(files[i])) fs.unlinkSync(files[i]);
		}
	});
}

function generateMedia(type, start, end, cb) {

	if (type==='video' && 'undefined' === typeof mediaURL.template.video) {
		return cb(null);
	}

	var q = queue(1),
		segments = [],
		ext = ((type==="video") ? "mp4" : "mp3");

 	start = Math.floor(start/segmentDuration);
	end = Math.ceil(end/segmentDuration);

	// Download init segment
	q.defer( fetchSegment, mediaURL.init[type], tmpPath + type + "-0.m4s");
	segments.push(tmpPath + type + "-0.m4s");

	// Download media segments
	for (var segment = start; segment < end; segment++) {
		q.defer( fetchSegment, mediaURL.template[type].replace("$Number$",segment), tmpPath + type + "-" + segment + ".m4s" );
		segments.push(tmpPath + type + "-" + segment + ".m4s");
	}

	// Concatenate files
	q.defer(cat, segments, tmpPath + type + ".m4s");

	q.await(function(err){
		if (err) return cb(err);
		// Build ffmpeg arguments
		var args = ['-loglevel', 'error'];
		args.push('-i', tmpPath + 'audio.m4s');
		if (type==="video") args.push('-i', tmpPath + 'video.m4s');
		args.push(tmpPath + type + '.' + ext);
		// Run ffmpeg
		var spawn = require("child_process").spawn,
			command = spawn("ffmpeg", args),
			err = "";
		command.stderr.on('data', function(data) {
			err += data;
		});
		command.on('exit', function() {
			if (err!=="") return cb(err);
			// Rename file, ready for collection
			fs.rename(tmpPath + type + '.' + ext, tmpPath + job + '.' + ext, function(err){cb(err)});
		});
	});

}

function startJob(req, res) {

	q = queue(1);

	// Validate times
	var start = +req.body.start || 0,
		end = +req.body.end || 0,
		now = Math.floor(Date.now() / 1000);
	if (start>end) [start, end] = [end, start];
	if (start==0 || end==0 || !req.body.vpid || req.body.vpid=="") {
		return res.json({ error: "Missing arguments." });
	}
	if (start<(now-43000)) {
		return res.json({ error: "Too far in the past. Clip must be from the last 12 hours." });
	}

	// Job ID
	job = uuid();
	tmpPath = path.join(__dirname, "../tmp/", job, "/");

	// Make temp dir
	q.defer(mkdirp, tmpPath);

	// Get MPD from Media Selector
	q.defer(getMpd, req.body.vpid);

	// Parse useful bits out of MPD
	q.defer(mpdParse);

	// Return expected filenames
	q.defer(function(cb){
		var fileAudio = "https://audiogram.newslabs.co/simulcast/media/" + job + ".mp3",
			fileVideo = mediaURL.template.video ? "https://audiogram.newslabs.co/simulcast/media/" + job + ".mp4" : null;
		res.json({ audio: fileAudio, video: fileVideo });
		cb(null);
	})

	// Generate audio file
	q.defer(generateMedia, "audio", req.body.start, req.body.end);

	// Generate video file
	q.defer(generateMedia, "video", req.body.start, req.body.end);

	q.await(function(err){
		if (err) {
			console.log(err);
			res.json({ error: err });
		}
		// Delete tmp media files
		if (fs.existsSync(tmpPath + "audio.m4s")) fs.unlinkSync(tmpPath + "audio.m4s");
		if (fs.existsSync(tmpPath + "video.m4s")) fs.unlinkSync(tmpPath + "video.m4s");
	});

}

function pipeMedia(req, res){
	var file = req.params.id.split("."),
		job = file[0],
		ext = file[1],
		mediaPath = path.join(__dirname, "../tmp/", job, "/", job + "." + ext);
	if (fs.existsSync(mediaPath)) {
		res.sendFile(mediaPath);
	} else {
		res.status(204).send('HTTP/1.1 204 No Content');
	}
}

module.exports = {
  post: startJob,
  pipe: pipeMedia
};
