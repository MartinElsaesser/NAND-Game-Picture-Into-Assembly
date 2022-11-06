const getPixels = require("get-pixels");
const fs = require("fs");
const util = require("util");

const asyncPixels = util.promisify(getPixels);

!async function main() {
	let pixels = await asyncPixels("./assembler.png");
	let pixelsInWhiteAndBlack = [];

	for (let i = 0; i < pixels.data.length; i += 4) {
		let blackWhiteVal = pixels.data[i] === 255 ? 0 : 1;
		pixelsInWhiteAndBlack.push(blackWhiteVal);
	}
	let pixelRegisterValues = get16bitPixelValues(pixelsInWhiteAndBlack);
	let code = getCode(pixelRegisterValues);
	fs.writeFileSync("output.asm", code);
}()

function get16bitPixelValues(pixels) {
	let values = [];
	for (let i = 0; i < pixels.length; i += 16) {
		let sum = pixels
			.slice(i, i + 16)
			.map((el, i) => el * Math.pow(2, 15 - i))
			.reduce((a, b) => a + b);
		values.push(sum);
	}
	return values;
}

function getCode(values) {
	let startingAddress = 16384;
	return values.map((value, i) => {
		if (value === 0) return "";

		let hex_addr = `0x${(i + startingAddress).toString(16)}`;
		let splitNumbers = splitNumberIntoSmallerOnes(value);
		let code = `# Set ${hex_addr} to ${value}\n`;
		splitNumbers.forEach((num, i) => {
			// optimizations:
			if (i >= 1 && num === splitNumbers[i - 1])
				return code += "D=D+A\n";
			if (i >= 1 && num === 1)
				return code += "D=D+1\n";

			code += `A=0x${num.toString(16)}\n`;
			code += i === 0 ? "D=A\n" : "D=D+A\n";
		});
		code += `A=${hex_addr}\n` + `*A=D\n`;
		return code;
	}).join("");
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
