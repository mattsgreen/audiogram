var serverSettings = require("../lib/settings/"),
	fs = require('fs'),
    path = require("path"),
    transports = require("../lib/transports");

function add(req, res) {

	delete require.cache[require.resolve('../settings/themes.json')];
	var themes = require('../settings/themes.json'),
		filename = path.join(__dirname, "../settings/themes.json");

	// Make a backup first
	fs.writeFile(filename + ".bk" + (+ new Date()), JSON.stringify(themes,null,'\t'), function(err){
		if(err) console.log("Error making theme.json backup: " + err);
	});

	// Get new theme
	var newTheme = JSON.parse(req.body.theme);

	if (req.files['background']) {
		var imgFilename = req.files['background'][0].filename;
		newTheme.backgroundImage = {landscape: imgFilename, portrait: imgFilename, square: imgFilename}; 
	}
	if (req.files['foreground']) {
		var imgFilename = req.files['foreground'][0].filename;
		newTheme.foregroundImage = {landscape: imgFilename, portrait: imgFilename, square: imgFilename}; 
	}

	console.log(newTheme);

	// Add theme
	themes[newTheme.name] = newTheme;

	// Sort alphabetically
	var keys = Object.keys(themes),
		i, len = keys.length,
		newThemes = {};
	keys.sort(function (a, b) {
	    return a.toLowerCase().localeCompare(b.toLowerCase());
	});
	newThemes["default"] = themes["default"];
	newThemes["Custom"] = themes["Custom"];
	for (i = 0; i < len; i++) {
		k = keys[i];
		if (k!="default" && k!="Custom") {
			newThemes[k] = themes[k];
		}
	}

	// Save themes
	var newJSON = JSON.stringify(newThemes,null,'\t');
	fs.writeFile(filename, newJSON, function(err){
		delete require.cache[require.resolve('../settings/themes.json')];
		if (err) {
			return res.json({error: err});
		} else {
			return res.json({error: null});
		}
	});

}

module.exports = {
  add: add
};