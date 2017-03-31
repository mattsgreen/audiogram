
var request = require('request'),
    queue = require("d3").queue,
    fs = require("fs"),
	kaldiBaseURL = "http://zgbwcsttapi04.labs.jupiter.bbc.co.uk/api/v0.2/stt",
	kaldiPoll;

function fetchTranscript(job, cb) {
	var requestURL = kaldiBaseURL + '/transcript/' + job;
	request(requestURL, function (error, response, body) {
		cb(error,body);
	});
}
function fetchSegments(job, cb) {
	var requestURL = kaldiBaseURL + '/segments/' + job;
	request(requestURL, function (error, response, body) {
		cb(error,body);
	});
}

function fetch(job, cb) {
	if (!kaldiPoll.error && kaldiPoll.status=="SUCCESS") {
		var q = queue(2);
		q.defer(fetchTranscript,job)
		 .defer(fetchSegments,job)
		 .await(function(error,transcript,segments){
		 	cb(error,{transcript: transcript, segments: segments});
	 	});
	} else {
		cb(null,null);
	}
}

function poll(job, cb) {
	var requestURL = kaldiBaseURL + '/status/' + job;
	request(requestURL, function (error, response, body) {
		var bodyJson = JSON.parse(body);
		kaldiPoll = {status: bodyJson.status, error: (error || bodyJson.error)}
		cb(error);
	});
}

function get(req, res) {
	var q = queue(1),
		job = req.params.job,
		transcript = null;
	q.defer(poll,job)
	 .defer(fetch,job)
	 .await(function(error,_,result){
		return 	res.json({
					job: job,
					status: kaldiPoll.status,
					error: error || kaldiPoll.error,
					transcript: result ? result.transcript : null,
					segments: result ? result.segments : null
				});
	 });
}

function post(req, res) {
	var formData = {
		file: fs.createReadStream(req.files['audio'][0].path)
	};
	request.post({url: kaldiBaseURL, formData: formData}, function (error, response, body) {
		var bodyJson = JSON.parse(body);
		return res.json({job: bodyJson.jobid, error: error});
	});
}


module.exports = {
  get: get,
  post: post
};