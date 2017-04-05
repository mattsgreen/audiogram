module.exports = function(req, res) {

  var user = req.header('ssl_client_verify') ? req.header('ssl_client_s_dn') : null;
  return res.json({user: user});

};