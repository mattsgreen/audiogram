
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
		listNew = req.body.list.split("\r\n");
	for (var person in listNew) {
		if (listNew.hasOwnProperty(person) && !listCurrent.includes(listNew[person])) {
			console.log("New user >>> " + listNew[person]);
		}
	}
	var list = JSON.stringify(listNew);
	fs.writeFile(path.join(__dirname, "../whitelist.json"), list, function(err){
		if (err) {
			return res.json({error: err});
		} else {
			return editor(req, res);
		}
	});
}

module.exports = {
  get: get,
  editor: editor,
  set: set
};