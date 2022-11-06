const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");
const path = require("path");

const asyncPixels = util.promisify(getPixels);

!async function main() {
	let pixels = await asyncPixels(path.join(__dirname, "./docker.png"));
	let pixelsInWhiteAndBlack = [];

	for (let i = 0; i < pixels.data.length; i += 4) {
		let blackWhiteVal = pixels.data[i] === 255 ? 0 : 1;
		// let blackWhiteVal = pixels.data[i] === 255 ? 1 : 0;
		pixelsInWhiteAndBlack.push(blackWhiteVal);
	}
	let pixelRegisterValues = get16bitPixelValues(pixelsInWhiteAndBlack);
	let addressPixelValueMap = createPixelValueMap(pixelRegisterValues);
	let code = getCode(addressPixelValueMap);
	fs.writeFileSync("output.txt", code);
}();

function createPixelValueMap(pixelRegisterValues) {
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

function getCode(registerPixelMap) {
	let code = "";
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
			// code += `# Set ${hex_addr} to ${pixelValue}\n`;
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