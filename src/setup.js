try {
	require("cheerio");
} catch (e) {
	console.log("Ставлю зависимости");
	require("child_process").execSync("npm i");
	console.log("Создаю папки");
	require("fs").mkdirSync("../mods");
	console.log("Теперь можете запускать MXP");
	process.exit(0);
}