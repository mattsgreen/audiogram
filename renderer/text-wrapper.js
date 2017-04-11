var smartquotes = require("smartquotes").string;

module.exports = function(theme) {

  // Do some typechecking
  var left = ifNumeric(theme.caption.left, 0, theme.width),
      right = ifNumeric(theme.caption.right, theme.width, theme.width),
      bottom = ifNumeric(theme.caption.bottom, null, theme.height),
      top = ifNumeric(theme.caption.top, null, theme.height);

  if (bottom === null && top === null) {
    top = 0;
  }

  var captionWidth = right - left;

  return function(context, caption) {

    if (!caption) {
      return;
    }

    var lines = [[]],
        maxWidth = 0,
        words = smartquotes(caption + "").trim().replace(/\s\s+/g, " \n").split(/ /g);

    context.font = theme.caption.font;
    context.textBaseline = "top";
    context.textAlign = theme.caption.align || "center";

    // Check whether each word exceeds the width limit
    // Wrap onto next line as needed
    words.forEach(function(word,i){

      var width = context.measureText(lines[lines.length - 1].concat([word]).join(" ")).width;

      if (word[0] === "\n" || (lines[lines.length - 1].length && width > captionWidth)) {

        word = word.trim();
        lines.push([word]);
        width = context.measureText(word).width;

      } else {

        lines[lines.length - 1].push(word);

      }

      maxWidth = Math.max(maxWidth,width);

    });

    var totalHeight = lines.length * theme.caption.lineHeight + (lines.length - 1) * theme.caption.lineSpacing;

    // horizontal alignment
    var x = theme.captionAlign === "left" ? left : theme.captionAlign === "right" ? right : (left + right) / 2;

    // Vertical alignment
    var y;

    if (top !== null && bottom !== null) {
      // Vertical center
      y = (bottom + top - totalHeight) / 2;
    } else if (bottom !== null) {
      // Vertical align bottom
      y = bottom - totalHeight;
    } else {
      // Vertical align top
      y = top;
    }

    context.fillStyle = theme.caption.color;
    lines.forEach(function(line, i){
      context.fillText(line.join(" "), x, y + i * (theme.caption.lineHeight + theme.caption.lineSpacing));
    });

 };


}

function ifNumeric(val, alt, ratio) {
  ratio = ratio || 1;
  return (typeof val === "number" && !isNaN(val)) ? val*ratio : alt;
}
