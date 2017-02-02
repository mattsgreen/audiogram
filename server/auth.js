module.exports = (WHITELIST) => {
  function isWhitelisted (emailAddress) {
    return WHITELIST.some(function(e) {
      var re = new RegExp(e,"i");
      return emailAddress.match(re)}
    );
  }

  return function middleware (req, res, next) {
    if (req.header('ssl_client_verify') === 'SUCCESS' && isWhitelisted(req.header('ssl_client_s_dn'))) {
      return next();
    }
    else {
      return res.status(401).send('HTTP/1.1 401 Unauthorized');
    }
  };
};