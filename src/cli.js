const inquirer = require("inquirer");
const curse = require("./curseforge");
const clear = require("clear");
const size = require("window-size");
const fs = require("fs");
const zip = require("./zip");
const signature = require("./signature");
const async = require("async");

const magic = fs.readFileSync("../config/welcometext.txt").toString();

const categories = Object.keys(curse.categories).map(e => curse.categories[e].locale);
const versions = Object.keys(curse.versions);
let _categories = {};

Object.keys(curse.categories).map(e => _categories[curse.categories[e].locale] = curse.categories[e].url);

require("colors");

let version = null;
let category = null;

function rnd(arr) {
	return arr[Math.floor(Math.random() * arr.length)];
}

function mainScreen() {
	clear();
	console.log(magic.red);
	console.log("=".repeat(size.width));

	inquirer.prompt([
		{
			message: "Чего хотел?",
			name: "btn",
			choices: ["Поиск модов", "Проверить цифровую подпись (Experimental feature)"],
			suffix: "",
			prefix: "",
			type: "list"
		}
	]).then(function(data) {
		if (data.btn === "Поиск модов") versionScreen();
		else if (data.btn === "Проверить цифровую подпись (Experimental feature)") signatureScreen();
	});
}

function versionScreen() {
	clear();
	inquirer.prompt([
		{
			name: "version",
			message: "Выберите версию: ",
			choices: [...versions, "[Назад в меню]"],
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
		if (data.version === "[Назад в меню]") return process.nextTick(() => mainScreen());

		version = curse.versions[data.version];
		categoriesScreen();
	});
}

function categoriesScreen() {
	clear();
	inquirer.prompt([
		{
			name: "cat",
			message: "Категория:",
			choices: [...categories, "[Назад в меню]"],
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
		if (data.cat === "[Назад в меню]") return process.nextTick(() => mainScreen());

		category = _categories[data.cat];
		modBrowse(1, category, version);
	});
}

function signatureScreen() {
	clear();

	console.log("Здесь вы можете сверить хэш модов с модами на CurseForge.");
	console.log("  1.".green, "Кидаете свои моды в папку mods");
	console.log("  2.".green, "Жмете 'Начать'");
	console.log("  3.".green, "Начнется проверка подписей");
	console.log("\n - Что значит 'Подпись неверна'?");
	console.log(" - Это значит, что данный мод был модифицирован (или же не тот мод нашелся). Может быть простая русификация, а могли и вирусы добавить".green);
	console.log("\n - Что значит 'Не нашел mcmod.info'?");
	console.log(" - Либо mcmod.info действительно отсутствует, либо по каким-то причинам не получилось открыть .jar".green);

	inquirer.prompt([
		{
			name: "btn",
			message: " ",
			choices: ["[Начать]", "[Назад в меню]"],
			suffix: "",
			prefix: "",
			type: "list"
		}
	]).then(function(data) {
		if (data.btn === "[Назад в меню]") return process.nextTick(() => mainScreen());

		process.nextTick(() => startSignCheck());
	});
}

function startSignCheck() {
	clear();
	console.log("== Проверка цифровой подписи ==".green);
	console.log("Для выхода зверски закройте окно");
	console.log("Читаю папку");

	const files = fs.readdirSync("../mods");

	console.log(rnd([
		"Жру память и проверяю хэши", 
		"Ревизорро начинает проверку", 
		"Собираем подписи населения и сверяем с паспортом"]));

	async.eachSeries(files, function(file, cb) {
		console.log("[>]", file);

		zip.getFile("../mods/" + file, "mcmod.info", function(content) {
			if (!content) return cb(console.log("Не нашел mcmod.info у", file, "- пропускаем"));

			const modinfo = JSON.parse(content.toString().replace(/(\r\n|\n|\r)/gm,""))[0];

			if (!modinfo.name) return cb(console.log("Нет названия у", file, "- сжигаем на костре"));

			curse.searchMod(modinfo.name, modinfo.version, undefined /* curse.versions[modinfo.mcversion] */, function(link) {
				if (!link) return cb(console.log("Не нашел", file, "на CurseForge"));

				signature.generateMD5("../mods/" + file, function(localSignature) {
					signature.URLgenerateMD5(link, function(curseSignature) {
						if (localSignature === curseSignature) {
							console.log(file, "- Подпись верна".green);
						} else {
							console.log(file.bgWhite.red + " - Подпись неверна".bgWhite.red);
						}

						cb();
					});
				});
			});
		});
	});
}

function modBrowse(page, category, version) {
	clear();
	console.log("Загружаю...");

	curse.searchModCategory(category, version, page, function(mods) {
		clear();
		inquirer.prompt([
			{
				name: "mod",
				message: "Моды " + "[стр. " + page + "]",
				type: "list",
				choices: mods.map(e => e.title).concat(
					[
						"[Назад в категории]",
						"[<= Пред. стр]",
						"[След. стр =>]"
					]
				),
				suffix: "",
				prefix: "",
				pageSize: size.height
			}
		]).then(function(data) {
			if (data.mod === "[Назад в категории]") process.nextTick(() => categoriesScreen());
			else if (data.mod === "[<= Пред. стр]") process.nextTick(() => modBrowse(page - 1, category, version));
			else if (data.mod === "[След. стр =>]") process.nextTick(() => modBrowse(page + 1, category, version));
			else fileBrowse(mods.find(e => e.title === data.mod), function() {
				process.nextTick(() => modBrowse(page, category, version));
			});
		});
	});
}

function fileBrowse(mod, cb) {
	clear();
	console.log("Загружаю...");
	curse.getAllFiles(mod.rawLink, version, function(files) {
		clear();

		inquirer.prompt([
			{
				name: "file",
				message: "Выберите файл для загрузки: ",
				type: "list",
				choices: files.map(e => e.title),
				suffix: "",
				prefix: "",
				pageSize: size.height - 4
			}
		]).then(function(data) {
			const filename = "../mods/" + data.file + (data.file.endsWith(".jar") ? "" : ".jar");

			clear();
			console.log("Скачиваю: " + data.file + "\nСюда: " + filename);

			curse.downloadMod(files.find(e => e.title === data.file).rawLink, filename, cb);
		}).catch(console.log);
	});
}

console.log("\n".repeat(100));

mainScreen();

function crash(e) {
	console.log("=".repeat(size.width));
	console.log("MXP Has crashed ;3\nPlease report it to developer github.com/macsmac");
	console.log("Details:\n");
	console.error(e.stack.toString().bgWhite.black);
	process.exit(1);
}

process.on("uncaughtException", crash);