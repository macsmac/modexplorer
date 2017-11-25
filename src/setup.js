const fs = require("fs");
const pkg = require("../package.json");

try {
	Object.keys(pkg.dependencies).forEach(require.resolve);
} catch (e) {
	console.log("Ставлю зависимости");
	require("child_process").execSync("npm i");
	console.log("Создаю папки");
	try {
		require("fs").mkdirSync("../mods");
	} catch(e) {}
	console.log("Теперь можете запускать MXP");
	process.exit(0);
}