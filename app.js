const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");
const path = require("path");

const PixelMap = require("./PixelMap");
const rgbaLigthness = require("./rgba_lightness");
const { wrapper, getImageTypeAndName } = require("./utils");
const compile = require("./code");
const asyncPixels = util.promisify(getPixels);

async function main() {
	// Get Image Meta Data
	let args = process.argv;
	if (!args[2]) throw "Path not passed in";
	let filepath = path.join(__dirname, args[2]);
	let { filename, extension } = getImageTypeAndName(filepath);
	filename = args[3] || filename;

	// Get Image Data
	let pixels = await asyncPixels(filepath);

	// Check for right image size
	let width = pixels.shape[0];
	let height = pixels.shape[1];
	if (width !== 512 || height !== 256)
		throw `Size not right, the size of the picture is ${width}x${height}`;

	// Process Image Data
	let pixelsInWhiteAndBlack = getPixelValues(pixels.data);
	let pixelRegisterValues = get16bitPixelValues(pixelsInWhiteAndBlack);
	let addressPixelValueMap = new PixelMap(pixelRegisterValues);

	// Output pixels
	let code = compile(addressPixelValueMap, filename);
	fs.writeFileSync("output.txt", code);
	console.log("Written your assembly picture to ./output.txt");
}
let safeMain = wrapper(main, (e) => { console.log(e); });
safeMain();

function getPixelValues(pixelData) {
	// returns Array of integers
	// with each entry representing one pixel on a screen
	// 1 meaning the pixel being on, 0 the pixel being off
	let pixelsInWhiteAndBlack = [];

	for (let i = 0; i < pixelData.length; i += 4) {
		let red = pixelData[i];
		let green = pixelData[i + 1];
		let blue = pixelData[i + 2];
		let alpha = pixelData[i + 3];

		let lightness = rgbaLigthness(red, green, blue, alpha);
		// TODO: maybe find average lightness and use this as means to set boundaries
		// let pixelValue = lightness > 60 ? 1 : 0;
		let pixelValue = lightness > 10 && lightness < 60 ? 1 : 0;
		pixelsInWhiteAndBlack.push(pixelValue);
	}
	return pixelsInWhiteAndBlack;
}

function get16bitPixelValues(pixels) {
	// returns array of pixels being bundled into packages of
	// 16 pixels for writing into 16 bit registers
	let values = [];
	for (let i = 0; i < pixels.length; i += 16) {
		let sum = pixels
			.slice(i, i + 16)
			.map((el, i) => el * Math.pow(2, 15 - i))
			.reduce((a, b) => +a + +b);
		values.push(sum);
	}
	return values;
}
