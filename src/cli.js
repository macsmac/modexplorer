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
	console.log(" - Powered by CurseForge");
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
			choices: ["[Строка поиска]", ...categories, "[Назад в меню]"],
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
		if (data.cat === "[Назад в меню]") return process.nextTick(() => mainScreen());
		else if (data.cat === "[Строка поиска]") return process.nextTick(() => searchScreen());
 
		category = _categories[data.cat];
		modBrowse(1, category, version);
	});
}

function searchScreen(text) {
	clear();
	console.log(magic.blue, "\n");

	console.log("[Нажмите enter чтобы выйти]".grey);

	inquirer.prompt([
		{
			type: "input",
			name: "search",
			message: "Запрос:",
			prefix: ""
		}
	]).then(function(data) {
		if (data.search === "") return process.nextTick(() => mainScreen());

		modBrowse(1, null, version, data.search);
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

		zip.getFile("../mods/" + file, ["mcmod.info", "cccmod.info"], function(content) {
			if (content != undefined) content = content.toString();

			if (!content) return cb(console.log("Не нашел mcmod.info у", file, "- пропускаем"));

			let modinfo = Object.create(JSON.parse(content.replace(/(\r\n|\n|\r)/gm,"")));
	
			if (modinfo[0]) modinfo = modinfo[0];
			else modinfo = modinfo.modList[0];

			if (!modinfo.name) return cb(console.log("Нет названия у", file, "- сжигаем на костре"));

			curse.searchMod(modinfo.name, modinfo.version, curse.versions[modinfo.mcversion], function(link) {
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

function modBrowse(page, category, version, search) {
	clear();
	console.log("Загружаю...");

	function showList(mods) {
		inquirer.prompt([
			{
				name: "mod",
				message: "Моды " + "[стр. " + page + "]",
				type: "list",
				choices: mods.map(e => e.title + "| " + e.description.slice(0, size.width - e.title.length - 6).green).concat(
					[
						!search ? "[Назад в категории]" : "[Назад к поиску]",
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
			else if (data.mod === "[<= Пред. стр]") process.nextTick(() => modBrowse(page - 1, category, version, search));
			else if (data.mod === "[След. стр =>]") process.nextTick(() => modBrowse(page + 1, category, version, search));
			else if (data.mod === "[Назад к поиску]") process.nextTick(() => searchScreen(search));
			else fileBrowse(mods.find(e => e.title === data.mod.split("|")[0]), function() {
				process.nextTick(() => modBrowse(page, category, version, search));
			});
		});
	}

	curse.searchModCategory(category, version, page, search, function(mods) {
		clear();
		showList(mods);
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
				choices: [...files.map(e => e.title), "[Назад]"],
				suffix: "",
				prefix: "",
				pageSize: size.height - 4
			}
		]).then(function(data) {
			if (data.file === "[Назад]") return cb();

			const filename = "../mods/" + data.file + (data.file.endsWith(".jar") ? "" : ".jar");

			clear();
			console.log("Скачиваю: " + data.file + "\nСюда: " + filename);

			curse.downloadMod(files.find(e => e.title === data.file).rawLink, filename, cb);
		});
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