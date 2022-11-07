const fs = require("fs");

module.exports.wrapper = function (fn, errorHandler) {
	return (...arguments) => {
		fn(...arguments).catch(errorHandler);
	};
}

module.exports.getImageTypeAndName = function (filepath) {
	if (!fs.existsSync(filepath)) throw "File does not exist!";

	let regex = /([^\\\/.]*)\.(\w*)$/;
	let matches = filepath.match(regex);
	if (!matches) throw "Not a valid file!";

	let [_, filename, extension] = matches;
	extension = extension.toLowerCase();

	// TODO: implement jpegs
	if (!["png", "jpeg", "jpg"].includes(extension)) throw "Neither a png nor a jpeg file!"

	return { filename, extension };
}