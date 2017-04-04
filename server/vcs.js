var request = require('request'),
    fs = require("fs");

function search(req, res) {
	var requestURL = "http://vcsio.newslabs.co/vcs/search/" + req.params.id;
	request(requestURL, function (error, response, body) {
		return res.json(response);
	});
}

function transcript(req, res) {
	var requestURL = "http://vcsio.newslabs.co/vcs/transcript/" + req.params.id;
	request(requestURL, function (error, response, body) {
		return res.json(response);
	});
}

function pipeMedia(req, res) {
	var requestURL = "http://zgbwclabsocto4.labs.jupiter.bbc.co.uk/vcs/media/" + req.params.id;
	var reply = request(requestURL);
	req.pipe(reply);
	reply.pipe(res);
}

module.exports = {
  search: search,
  transcript: transcript,
  media: pipeMedia
};