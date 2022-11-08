module.exports = class PixelMap {
	pixels = [];
	map = {};
	constructor(pixelRegisterValues, startingAddress) {
		pixelRegisterValues.forEach((pixels, i) => {
			if (pixels === 0) return;
			this._add(startingAddress + i, pixels);
		});
	}
	_add(address, pixels) {
		if (!this.pixels.includes(pixels)) {
			this.pixels.push(pixels);
			this.map[pixels] = [];
		}
		this.map[pixels].push(address);
	}

	getRegisters(pixels) {
		return this.map[pixels];
	}
}