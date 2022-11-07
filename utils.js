module.exports.wrapper = function (fn, errorHandler) {
	return (...arguments) => {
		fn(...arguments).catch(errorHandler);
	};
}