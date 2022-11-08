// https://stackoverflow.com/questions/596216/formula-to-determine-perceived-brightness-of-rgb-color#answer-56678483
function sRGBtoLin(colorChannel) {
	// Send this function a decimal sRGB gamma encoded color value
	// between 0.0 and 1.0, and it returns a linearized value.

	if (colorChannel <= 0.04045) {
		return colorChannel / 12.92;
	} else {
		return Math.pow(((colorChannel + 0.055) / 1.055), 2.4);
	}
}
function YtoLstar(Y) {
	// Send this function a luminance value between 0.0 and 1.0,
	// and it returns L* which is "perceptual lightness"

	if (Y <= (216 / 24389)) {       // The CIE standard states 0.008856 but 216/24389 is the intent for 0.008856451679036
		return Y * (24389 / 27);  // The CIE standard states 903.3, but 24389/27 is the intent, making 903.296296296296296
	} else {
		return Math.pow(Y, (1 / 3)) * 116 - 16;
	}
}
module.exports = function (red, green, blue, alpha) {
	alpha = alpha / 255;
	red = red / 255 * alpha;
	green = green / 255 * alpha;
	blue = blue / 255 * alpha;

	let luminance = (
		0.2126 * sRGBtoLin(red)
		+ 0.7152 * sRGBtoLin(green)
		+ 0.0722 * sRGBtoLin(blue)
	);
	return YtoLstar(luminance);
}