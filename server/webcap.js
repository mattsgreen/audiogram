var request = require('request'),
	reith = "http://www-cache.reith.bbc.co.uk:80",
    fs = require("fs");
    path = require("path"),
    DIR = path.join(__dirname, "../webcap/");

// var DIR = "/Volumes/Editing_DropZone/From WebCap/HD Straps";
// /opt/bbc/newslabs/audiogram/webcap

module.exports = function(req, res) {

	// Pipe file
	if (req.params.file) {
		return res.sendFile(DIR + "/" + req.params.file);
	}
	
	// List files
	var files = [];
	fs.readdir(DIR, (err, files) => {
		if (err) return res.json({err: err});
		files.sort(function(a, b) {
			return fs.statSync(DIR + "/" + b).mtime.getTime() - fs.statSync(DIR + "/" + a).mtime.getTime();
		});
		files.forEach(file => {
			files.push(file);
		});
		return res.json({ files: files });
	});

};