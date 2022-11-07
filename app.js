const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");
const path = require("path");
const rgbLigthness = require("./rgb_lightness");
const { wrapper } = require("./utils");
const compile = require("./code");
const asyncPixels = util.promisify(getPixels);

async function main() {
	// Get Image Meta Data
	let args = process.argv;
	if (!args[2]) throw "Path not passed in";
	let filepath = path.join(__dirname, args[2]);
	let { filename, extension } = getImageTypeAndName(filepath);
	filename = args[3] || filename;

	// Process Image Data
	let pixels = await asyncPixels(filepath);
	let width = pixels.shape[0];
	let height = pixels.shape[1];
	if (width !== 512 || height !== 256)
		throw `Size not right, the size of the picture is ${width}x${height}`;
	let pixelsInWhiteAndBlack = getPixelValuesPNG(pixels.data);
	let pixelRegisterValues = get16bitPixelValues(pixelsInWhiteAndBlack);
	let addressPixelValueMap = createPixelValueMap(pixelRegisterValues);

	// Output pixels
	let code = compile(addressPixelValueMap, filename);
	fs.writeFileSync("output.txt", code);
	console.log("Written your assembly picture to ./output.txt");
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

	// TODO: implement jpegs
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
		// let pixelValue = lightness > 60 ? 1 : 0;
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

class Code {
	static FILE_DESCRIPTION(name) {
		return `# Output ${name} to the screen\n`;
	}
	static SPLIT_NUMBER(number) {
		// break Numbers bigger than 0x7fff/32767
		// into smaller numbers, which can be loaded
		// into the A register (number range is decreased because of op-code-bit)
		// thus you can only input numbers up to 0x7fff
		let currentValue = number;
		let addUpToValue = [];
		while (currentValue > 32767) {
			currentValue -= 32767;
			addUpToValue.push(32767);
		}
		addUpToValue.push(currentValue);
		return addUpToValue;
	}
	static LOAD_D_DESCRIPTION(pixelValue) {
		return `# Load ${pixelValue} into D Register\n`;
	}
	static LOAD_D_REGISTER(numbers) {
		let loadDRegister = "";
		numbers.forEach((num, i) => {
			// optimizations:
			if (i >= 1 && num === numbers[i - 1])
				return loadDRegister += "D=D+A\n";
			if (i >= 1 && num === 1)
				return loadDRegister += "D=D+1\n";

			loadDRegister += `A=0x${(num).toString(16)}\n`;
			loadDRegister += i === 0 ? "D=A\n" : "D=D+A\n";
		});
		return loadDRegister;
	}
	static HEX_ADDRESS(num) {
		return `0x${num.toString(16)}`;
	}
	static LOAD_ADDRESS_DESCRIPTION(hexAddress, register) {
		return `# Set ${hexAddress} to ${register}\n`;
	}
	static LOAD_D_INTO_ADDRESS(hexAddress) {
		return `A=${hexAddress}\n*A=D\n`;
	}
	static compile(registerPixelMap, imageName) {
		let code = Code.FILE_DESCRIPTION(imageName);
		for (let pixelValue in registerPixelMap) {
			// load pixel Value into D register
			let pixels = parseInt(pixelValue);
			code += Code.LOAD_D_DESCRIPTION(pixels);
			let numbersArr = Code.SPLIT_NUMBER(pixels);
			code += Code.LOAD_D_REGISTER(numbersArr);

			// save value of D register into ram registers
			registerPixelMap[pixelValue].forEach(register => {
				let hex_addr = Code.HEX_ADDRESS(register);
				code += Code.LOAD_ADDRESS_DESCRIPTION(hex_addr, pixelValue);
				code += Code.LOAD_D_INTO_ADDRESS(hex_addr);
			})
		}
		return code;
	}
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