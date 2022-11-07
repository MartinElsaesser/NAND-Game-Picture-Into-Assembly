const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");
const path = require("path");

const PixelMap = require("./PixelMap");
const rgbaLigthness = require("./rgba_lightness");
const { wrapper, getImageTypeAndName } = require("./utils");
const { compile, Nand_2_Tetris_Builder, Nand_Game_Builder } = require("./compile");
const asyncPixels = util.promisify(getPixels);

let nand2Tetris_config = {
	invertBits: false,
	builder: Nand_2_Tetris_Builder,
	format: "asm"
}

let nandGame_config = {
	invertBits: true,
	builder: Nand_Game_Builder,
	format: "txt"
}

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


	let config = {};
	let platform = "nand2tetris"; // nandgame | nand2tetris
	if (platform === "nandgame") config = nandGame_config;
	if (platform === "nand2tetris") config = nand2Tetris_config;

	// Get Image Data
	let pixels = await asyncPixels(filepath);

	// Check for right image size
	let width = pixels.shape[0];
	let height = pixels.shape[1];
	if (width !== 512 || height !== 256)
		throw `Size not right, the size of the picture is ${width}x${height}`;

	// Process Image Data
	let pixelsInWhiteAndBlack = getPixelValues(pixels.data);
	let pixels16Bit = get16bitPixels(pixelsInWhiteAndBlack, config.invertBits);
	let addressPixelValueMap = new PixelMap(pixels16Bit);

	// Output pixels
	let builder = new config.builder();
	let code = compile(builder, addressPixelValueMap, filename);
	fs.writeFileSync(`${filename}.${config.format}`, code);
	console.log(`Written your assembly picture to ./${filename}.${config.format}`);
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
		let pixelValue = lightness > 40 ? 0 : 1;
		// let pixelValue = lightness > 10 && lightness < 60 ? 1 : 0;
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
