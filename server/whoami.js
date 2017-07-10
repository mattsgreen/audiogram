module.exports = function(req, res) {

  var user = req.header('BBC_IDOK') ? req.header('BBC_EMAIL') : null;
  return res.json({user: user});

};
