
function prettySize(size) {

  var mb = size / 1000000,
    rounded = mb >= 1 ? Math.floor(10 * mb) / 10 : Math.floor(100 * mb) / 100;

  return rounded + " MB";

}

module.exports = {
  prettySize: prettySize
};