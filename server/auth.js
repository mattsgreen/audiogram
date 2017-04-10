module.exports = (WHITELIST) => {

  function isAdmin (emailAddress) {
    var ADMINS = ["jonty.usborne@bbc.co.uk", "rachel.wilson@bbc.co.uk", "robert.mckenzie@bbc.co.uk", "miles.bernie@bbc.co.uk"];
    return ADMINS.some(function(e) {
      var re = new RegExp(e,"i");
      return emailAddress.match(re)}
    );
  }

  function isWhitelisted (emailAddress) {
    return WHITELIST.some(function(e) {
      var re = new RegExp(e,"i");
      return emailAddress.match(re)}
    );
  }

  return function middleware (req, res, next) {

    if (req.url.startsWith("/whitelist")) {
      // Edit whitelist
      if (req.header('ssl_client_verify') === 'SUCCESS' && isAdmin(req.header('ssl_client_s_dn'))) {
        delete require.cache[require.resolve('../whitelist.json')];
        WHITELIST = require('../whitelist.json');
        return next();
      } else {
        return res.status(401).send('HTTP/1.1 401 Unauthorized');
      }
    }

    var reg = new RegExp("^/(css|fonts|images|favicon)", "i"); // Don't block these requests
    if (reg.test(req.url) || (req.header('ssl_client_verify') === 'SUCCESS' && isWhitelisted(req.header('ssl_client_s_dn')))) {
      return next();
    } else {
      var path = require("path"),
          errPage = path.join(__dirname, "..", "401.html");
      return res.status(401).sendFile(errPage);
    }

  }

};