const fs = require("fs");
const path = require("path");
const { getImageTypeAndName, wrapper } = require("./utils");

const { compile_image_to_assembly, Nand_2_Tetris_Config, Nand_Game_Config } = require("./compile_image_to_assembly");

function printHelp() {
	console.log("Help");
}

async function main() {
	// Get Image Meta Data
	let args = process.argv;
	if (!args[2]) throw "Path not passed in";
	if (args[2] === "-h") return printHelp();
	let filepath = path.join(__dirname, args[2]);
	let { filename, extension } = getImageTypeAndName(filepath);
	let platform = "";

	for (let i = 3; i < args.length; i++) {
		const arg = args[i];
		if (arg === "-n" && args[i + 1] && !args[i + 1].startsWith("-")) {
			filename = args[i + 1]
			i++;
		}
		if (arg === "-p" && args[i + 1] && !args[i + 1].startsWith("-")) {
			platform = args[i + 1]
			i++;
		}
	}

	let config;
	console.log(platform);
	if (platform === "nandgame") config = new Nand_Game_Config();
	else if (platform === "nand2tetris") config = new Nand_2_Tetris_Config();
	else throw "Enter a valid platform";

	let code = await compile_image_to_assembly(config, filepath, filename);

	fs.writeFileSync(`${filename}.${config.format}`, code);
	console.log(`Written your assembly picture to ./${filename}.${config.format}`);
}

let safeMain = wrapper(main, (e) => { console.log(e); });
safeMain();
