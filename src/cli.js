const inquirer = require("inquirer");
const curse = require("./curseforge");
const clear = require("clear");
const size = require("window-size");

const categories = Object.keys(curse.categories).map(e => curse.categories[e].locale);
const versions = Object.keys(curse.versions);
let _categories = {};

Object.keys(curse.categories).map(e => _categories[curse.categories[e].locale] = curse.categories[e].url);

require("colors");

let version = null;
let category = null;

function mainScreen() {
	clear();
	inquirer.prompt([
		{
			name: "version",
			message: "Выберите версию: ",
			choices: versions,
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
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
			choices: categories,
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
		category = _categories[data.cat];
		modBrowse(1, category, version);
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