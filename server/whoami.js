module.exports = function(req, res) {

	var email = req.header('BBC_IDOK') ? req.header('BBC_EMAIL') : null,
		name = req.header('BBC_IDOK') ? req.header('BBC_FULLNAME') : null;

	return res.json({name: name, email: email});

};
