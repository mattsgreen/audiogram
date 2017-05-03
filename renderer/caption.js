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

    var lines = caption.split("\n"),
        ratio = { // Font sizes/spacing are relative to the default theme size, (1280x720), so scale accordingly
          width: theme.width/1280,
          height: theme.height/720
        },
        fontSize = theme.caption.fontSize * ratio.width,
        font = theme.caption.fontWeight + " " + fontSize + "px " + theme.caption.font,
        totalHeight = lines.length * fontSize + (lines.length - 1) * theme.caption.lineSpacing,
        horizontal = ifNumeric(+theme.caption.margin.horizontal, 0.5, theme.width),
        vertical = ifNumeric(+theme.caption.margin.vertical, 0.5, theme.height);

    var x = horizontal;

    if (theme.caption.valign=="top") {
      y = vertical;
    } else if (theme.caption.valign=="bottom") {
      y = vertical - totalHeight;
    } else {
      y = vertical - totalHeight/2;
    }

    context.fillStyle = theme.caption.color;
    context.font = font;
    context.textBaseline = "top";
    context.textAlign = theme.caption.align || "center";

    lines.forEach(function(line, i){
      context.fillText(line, x, y + i * (fontSize + theme.caption.lineSpacing));
    });

 };

}

function ifNumeric(val, alt, ratio) {
  ratio = ratio || 1;
  return (typeof val === "number" && !isNaN(val)) ? val*ratio : alt;
}
