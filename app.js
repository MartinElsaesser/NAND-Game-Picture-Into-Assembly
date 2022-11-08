const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");
const path = require("path");

const PixelMap = require("./PixelMap");
const rgbaLightness = require("./rgba_lightness");
const { wrapper, getImageTypeAndName } = require("./utils");
const { compile, Nand_Game_Config, Nand_2_Tetris_Config } = require("./compile");
const asyncPixels = util.promisify(getPixels);

async function main() {
	// Get Image Meta Data
	let args = process.argv;
	if (!args[2]) throw "Path not passed in";
	let filepath = path.join(__dirname, args[2]);
	let { filename, extension } = getImageTypeAndName(filepath);

	for (let i = 3; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-n" && args[i + 1] && !args[i + 1].startsWith("-")) {
			filename = args[i + 1]
			i++;
		}
	}


	let config
	let platform = "nand2tetris"; // nandgame | nand2tetris
	if (platform === "nandgame") config = new Nand_Game_Config();
	if (platform === "nand2tetris") config = new Nand_2_Tetris_Config();

	// Get Image Data
	let pixels = await asyncPixels(filepath);

	// Check for right image size
	let width = pixels.shape[0];
	let height = pixels.shape[1];
	if (width !== 512 || height !== 256)
		throw `Size not right, the size of the picture is ${width}x${height}`;

	// Process Image Data
	let pixelsInWhiteAndBlack = getPixelValues(pixels.data, 0, 50, false);
	let pixels16Bit = get16bitPixels(pixelsInWhiteAndBlack, config.invertBits);
	let addressPixelValueMap = new PixelMap(pixels16Bit, config.screenStartingAddress);

	// Output pixels
	let builder = new config.builder();
	let code = compile(builder, addressPixelValueMap, filename, config.biggestPossibleNum);
	fs.writeFileSync(`${filename}.${config.format}`, code);
	console.log(`Written your assembly picture to ./${filename}.${config.format}`);
}
let safeMain = wrapper(main, (e) => { console.log(e); });
safeMain();

function getPixelValues(pixelData, lowerBound, upperBound, invertPixels) {
	// returns Array of integers
	// with each entry representing one pixel on a screen
	// 1 meaning the pixel being on, 0 the pixel being off
	let pixelsInWhiteAndBlack = [];

	for (let i = 0; i < pixelData.length; i += 4) {
		let red = pixelData[i];
		let green = pixelData[i + 1];
		let blue = pixelData[i + 2];
		let alpha = pixelData[i + 3];

		// TODO: transparency counts as black pixel, but should be white
		let lightness = rgbaLightness(red, green, blue, alpha);
		// TODO: maybe find average lightness and use this as means to set boundaries
		let turnPixelOn = lightness >= lowerBound && lightness <= upperBound;
		let onPixel = invertPixels ? 0 : 1;
		let offPixel = invertPixels ? 1 : 0;
		let pixelValue = turnPixelOn ? onPixel : offPixel;
		pixelsInWhiteAndBlack.push(pixelValue);
	}
	return pixelsInWhiteAndBlack;
}

function get16bitPixels(pixels, invertBits = false) {
	// returns array of pixels being bundled into packages of
	// 16 pixels for writing into 16 bit registers
	let values = [];
	for (let i = 0; i < pixels.length; i += 16) {
		let sum = pixels
			.slice(i, i + 16)
			.map((bit, place) => bit * Math.pow(2, invertBits ? 15 - place : place))
			.reduce((a, b) => a + b);
		values.push(sum);
	}
	return values;
}
