class Config {
	constructor(invertBits, builder, screenStartingAddress, biggestPossibleNum, format) {
		this.invertBits = invertBits;
		this.builder = builder;
		this.screenStartingAddress = screenStartingAddress;
		this.biggestPossibleNum = biggestPossibleNum;
		this.format = format;
	}
}

class Nand_2_Tetris_Config extends Config {
	constructor() {
		super(false, Nand_2_Tetris_Builder, 16384, 32767, "asm");
	}
}
class Nand_Game_Config extends Config {
	constructor() {
		super(true, Nand_Game_Builder, 16384, 32767, "txt");
	}
}

class Machine_Code_Builder {
	code = "";
	comment(string) {
	}
	D$D_plus_A() {
	}
	D$D_plus_1() {
	}
	D$A() {
	}
	M$D() {
	}
	A$(num) {
	}
}

class Nand_Game_Builder extends Machine_Code_Builder {
	code = "";
	comment(string) {
		this.code += `# ${string}\n`;
	}
	D$D_plus_A() {
		this.code += "D=D+A\n";
	}
	D$D_plus_1() {
		this.code += "D=D+1\n";
	}
	D$A() {
		this.code += "D=A\n";
	}
	M$D() {
		this.code += "*A=D\n";
	}
	A$(num) {
		if (!isNumber(num)) throw "Only takes in numbers";
		this.code += `A=${num}\n`;
	}
}

class Nand_2_Tetris_Builder extends Machine_Code_Builder {
	code = "";
	comment(string) {
		this.code += `// ${string}\n`;
	}
	D$D_plus_A() {
		this.code += "D=D+A\n";
	}
	D$D_plus_1() {
		this.code += "D=D+1\n";
	}
	D$A() {
		this.code += "D=A\n";
	}
	M$D() {
		this.code += "M=D\n";
	}
	A$(num) {
		if (!isNumber(num)) throw "Only takes in numbers";
		this.code += `@${num}\n`;
	}
}

function spiltNumber(number, biggestPossibleNum) {
	// break Numbers bigger than 0x7fff/32767
	// into smaller numbers, which can be loaded
	// into the A register (number range is decreased because of op-code-bit)
	// thus you can only input numbers up to 0x7fff
	if (!(isNumber(number) && isNumber(biggestPossibleNum)))
		throw "Only takes in numbers";
	let currentValue = number;
	let addUpToValue = [];
	while (currentValue > biggestPossibleNum) {
		currentValue -= biggestPossibleNum;
		addUpToValue.push(biggestPossibleNum);
	}
	addUpToValue.push(currentValue);
	return addUpToValue;
}

function isNumber(n) {
	return !isNaN(parseFloat(n)) && !isNaN(n - 0);
}

function compile(builder, regPixMap, imageName, biggestPossibleNum) {
	// let builder = new Nand_2_Tetris_Builder();
	if (!builder instanceof Machine_Code_Builder) throw "Pass in a valid builder";
	builder.comment(`Output ${imageName} to the screen`);


	for (const pixels of regPixMap.pixels) {
		builder.comment(`Load ${pixels} into D Register`);
		let numbersArr = spiltNumber(pixels, biggestPossibleNum);


		// load pixel Value into D register
		for (let i = 0; i < numbersArr.length; i++) {
			let num = numbersArr[i], lastNum = numbersArr[i - 1] || null;
			// optimization
			if (i >= 1 && num === lastNum) {
				builder.D$D_plus_A();
				continue;
			}
			if (i >= 1 && num === 1) {
				builder.D$D_plus_1();
				continue;
			}
			// load first num into D, then keep adding following numbers to D
			builder.A$(num);
			if (i === 0) builder.D$A();
			else builder.D$D_plus_A();
		}


		// save value of D register into ram registers
		for (const register of regPixMap.getRegisters(pixels)) {
			builder.comment(`Set ${register} to ${pixels}`);
			builder.A$(register);
			builder.M$D();
		}


	}


	return builder.code;
}

module.exports = {
	compile,
	Nand_2_Tetris_Config,
	Nand_Game_Config
};