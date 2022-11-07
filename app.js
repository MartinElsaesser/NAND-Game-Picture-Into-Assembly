const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");
const path = require("path");
const rgbLigthness = require("./rgb_lightness");
const { wrapper } = require("./utils");
const asyncPixels = util.promisify(getPixels);

async function main() {
	let filepath = path.join(__dirname, "./pics/car.png");
	let { filename, extension } = getImageTypeAndName(filepath);
	let pixels = await asyncPixels(filepath);
	let pixelsInWhiteAndBlack = getPixelValuesPNG(pixels.data);
	let pixelRegisterValues = get16bitPixelValues(pixelsInWhiteAndBlack);
	let addressPixelValueMap = createPixelValueMap(pixelRegisterValues);
	let code = getCode(addressPixelValueMap, filename);
	fs.writeFileSync("output.txt", code);
}
let safeMain = wrapper(main, (e) => { console.log(e); });
safeMain();

function getImageTypeAndName(filepath) {
	if (!fs.existsSync(filepath)) throw "File does not exist!";

	let regex = /([^\\\/.]*)\.(\w*)$/;
	let matches = filepath.match(regex);
	if (!matches) throw "Not a valid file!";

	let [_, filename, extension] = matches;
	extension = extension.toLowerCase();

	// if (!["png", "jpeg"].includes(extension)) throw "Neither a png nor a jpeg file!"
	if (!["png"].includes(extension)) throw "Not a png file!";

	return { filename, extension };
}

function getPixelValuesPNG(pixelData) {
	// returns Array of integers
	// with each entry representing one pixel on a screen
	// 1 meaning the pixel being on, 0 the pixel being off
	let pixelsInWhiteAndBlack = [];

	for (let i = 0; i < pixelData.length; i += 4) {
		let alpha = pixelData[i + 3] / 255;
		let red = pixelData[i] / 255 * alpha;
		let green = pixelData[i + 1] / 255 * alpha;
		let blue = pixelData[i + 2] / 255 * alpha;

		let lightness = rgbLigthness(red, green, blue);
		// TODO: maybe find average lightness and use this as means to set boundaries
		// let pixelValue = lightness > 20 && lightness < 60 ? 1 : 0;
		let pixelValue = lightness > 50 ? 0 : 1;
		pixelsInWhiteAndBlack.push(pixelValue);
	}
	return pixelsInWhiteAndBlack;
}

function createPixelValueMap(pixelRegisterValues) {
	// returns map with key being multiple pixel values for one register
	// and the keys array being all the registers the value will be written to
	// e.g.:
	// {
	// 	"1203": [16386,30531],
	// }
	let map = {};
	let startingAddress = 16384;
	pixelRegisterValues.forEach((registerVal, i) => {
		if (registerVal === 0) return;
		if (!map[registerVal]) map[registerVal] = [];
		map[registerVal].push(startingAddress + i);
	});
	return map;
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

function getCode(registerPixelMap, imageName) {
	let code = `# Output ${imageName} to the screen\n`;
	for (let pixelValue in registerPixelMap) {
		// load pixel Value into D register
		code += `# Load ${pixelValue} into D\n`;
		let splitNumbers = splitNumberIntoSmallerOnes(parseInt(pixelValue));
		splitNumbers.forEach((num, i) => {
			// optimizations:
			if (i >= 1 && num === splitNumbers[i - 1])
				return code += "D=D+A\n";
			if (i >= 1 && num === 1)
				return code += "D=D+1\n";

			code += `A=0x${(num).toString(16)}\n`;
			code += i === 0 ? "D=A\n" : "D=D+A\n";
		});

		// save value of D register into addresses
		registerPixelMap[pixelValue].forEach(register => {
			let hex_addr = `0x${register.toString(16)}`;
			code += `# Set ${hex_addr} to ${pixelValue}\n`;
			code += `A=${hex_addr}\n` + `*A=D\n`;
		})
	}
	return code;
}

function splitNumberIntoSmallerOnes(number) {
	// break Numbers bigger than 0x7fff/32767
	// into smaller numbers, which can be loaded
	// into the A register (number range is decreased because of op-code-bit)
	let currentValue = number;
	let addUpToValue = [];
	while (currentValue > 32767) {
		currentValue -= 32767;
		addUpToValue.push(32767);
	}
	addUpToValue.push(currentValue);
	return addUpToValue;
}