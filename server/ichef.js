var request = require('request'),
	reith = "http://www-cache.reith.bbc.co.uk:80",
    fs = require("fs");

function pipeMedia(req, res) {
	var requestURL = "http://ichef.live.bbci.co.uk/images/ic/raw/" + req.params.pid + ".jpg";
	var reply = request({url: requestURL, proxy: reith});
	req.pipe(reply);
	reply.pipe(res);
}

module.exports = {
  pipe: pipeMedia
};