
function get(req, res) {
	delete require.cache[require.resolve('../whitelist.json')];
	var list = require('../whitelist.json');
	return res.json({list});
}

function editor(req, res) {
	var path = require("path"),
		whitelistPage = path.join(__dirname, "../editor/whitelist.html");
	return res.sendFile(whitelistPage);
}

function set(req, res) {
	var fs = require('fs'),
		path = require("path"),
		listCurrent = require('../whitelist.json'),
		listNew = req.body.list.replace("\r","").split("\n"),
		diff = {"added":[],"removed":[]};
	// Find newly added users
		for (var person in listNew) {
			if ( listNew.hasOwnProperty(person) && listCurrent.indexOf(listNew[person]) === -1 ) {
				diff.added.push(listNew[person]);
			}
		}
	// Find removed users
		for (var person in listCurrent) {
			if ( listCurrent.hasOwnProperty(person) && listNew.indexOf(listCurrent[person]) === -1 ) {
				diff.removed.push(listCurrent[person]);
			}
		}
	console.log(JSON.stringify(diff));
	// Update list
		var list = JSON.stringify(listNew);
		fs.writeFile(path.join(__dirname, "../whitelist.json"), list, function(err){
			if (err) {
				return res.json({error: err});
			} else {
				return res.json({error: null, diff: diff});
				// return editor(req, res);
			}
		});
}

module.exports = {
  get: get,
  editor: editor,
  set: set
};