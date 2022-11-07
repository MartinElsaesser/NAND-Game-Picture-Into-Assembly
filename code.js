function file_description(name) {
	return `# Output ${name} to the screen\n`;
}

function SPLIT_NUMBER(number) {
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

function load_d_description(pixelValue) {
	return `# Load ${pixelValue} into D Register\n`;
}

function LOAD_D_REGISTER(numbers) {
	let loadDRegister = "";
	for (let i = 0; i < numbers.length; i++) {
		let num = numbers[i];
		let lastNum = numbers[i - 1] || null;

		if (i >= 1 && num === lastNum) {
			loadDRegister += "D=D+A\n";
			continue;
		}
		if (i >= 1 && num === 1) {
			loadDRegister += "D=D+1\n";
			continue;
		}

		loadDRegister += `A=${HEX_ADDRESS(num)}\n`;
		// initially load number into D register than add
		// the following numbers to the D register to make
		// up the wanted number
		// this must be done because of op-code limitation
		loadDRegister += i === 0 ? "D=A\n" : "D=D+A\n";
	}
	return loadDRegister;
}

function HEX_ADDRESS(num) {
	return `0x${num.toString(16)}`;
}

function load_address_description(hexAddress, register) {
	return `# Set ${hexAddress} to ${register}\n`;
}

function LOAD_D_INTO_ADDRESS(hexAddress) {
	return `A=${hexAddress}\n*A=D\n`;
}

// regPixMap of type PixelMap
module.exports = function compile(regPixMap, imageName) {
	let code = file_description(imageName);

	for (const pixels of regPixMap.pixels) {
		// load pixel Value into D register
		code += load_d_description(pixels);
		let numbersArr = SPLIT_NUMBER(pixels);
		code += LOAD_D_REGISTER(numbersArr);

		// save value of D register into ram registers
		for (const register of regPixMap.getRegisters(pixels)) {
			let hex_addr = HEX_ADDRESS(register);
			code += load_address_description(hex_addr, pixels);
			code += LOAD_D_INTO_ADDRESS(hex_addr);
		}
	}
	return code;
}