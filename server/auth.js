module.exports = (WHITELIST) => {
  function isWhitelisted (emailAddress) {
    return WHITELIST.some(function(e) {
      var re = new RegExp(e,"i");
      return emailAddress.match(re)}
    );
  }

  return function middleware (req, res, next) {
    var reg = new RegExp("^/(css|fonts|images|favicon)", "i"); // Don't block these requests
    if (reg.test(req.url) || (req.header('ssl_client_verify') === 'SUCCESS' && isWhitelisted(req.header('ssl_client_s_dn')))) {
      return next();
    }
    else {
      var path = require("path"),
          errPage = path.join(__dirname, "..", "401.html");
      return res.status(401).sendFile(errPage);
    }
  };
};