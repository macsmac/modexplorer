const inquirer = require("inquirer");
const curse = require("./curseforge");
const clear = require("clear");
const size = require("window-size");
const fs = require("fs");
const https = require("https");
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
			choices: ["Поиск модов", "Проверить цифровую подпись (Experimental feature)", "Экспортировать/импортировать модпаки"],
			suffix: "",
			prefix: "",
			type: "list"
		}
	]).then(function(data) {
		if (data.btn === "Поиск модов") versionScreen();
		else if (data.btn === "Проверить цифровую подпись (Experimental feature)") signatureScreen();
		else if (data.btn === "Экспортировать/импортировать модпаки") modpackScreen();
	});
}

function versionScreen(cb, endCb) {
	clear();
	inquirer.prompt([
		{
			name: "version",
			message: "Выберите версию: ",
			choices: [...versions, "[Назад]"],
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
		if (data.version === "[Назад в меню]") return process.nextTick(() => mainScreen());

		version = curse.versions[data.version];
		categoriesScreen(cb, endCb);
	});
}

function categoriesScreen(cb, endCb) {
	clear();
	inquirer.prompt([
		{
			name: "cat",
			message: "Категория:",
			choices: ["[Строка поиска]", ...categories, !endCb ? "[Назад в меню]" : "[Экспортировать]"],
			suffix: "",
			prefix: "",
			type: "list",
			pageSize: size.height - 4
		}
	]).then(function(data) {
		// полюбому надо рефакторить 
		// Но потом ;3
		if (data.cat === "[Экспортировать]") return process.nextTick(() => endCb());
		else if (data.cat === "[Назад в меню]") return process.nextTick(() => mainScreen());
		else if (data.cat === "[Строка поиска]") 
			return process.nextTick(() => searchScreen(cb, endCb));
 
		category = _categories[data.cat];
		modBrowse(1, category, version, undefined, cb, endCb);
	});
}

function searchScreen(cb, endCb) {
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
		if (data.search === "") return process.nextTick(() => categoriesScreen(cb, endCb));

		modBrowse(1, null, version, data.search, cb, endCb);
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

function modBrowse(page, category, version, search, cbFileBrowse, endCb) {
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
			if (data.mod === "[Назад в категории]") process.nextTick(() => categoriesScreen(cbFileBrowse, endCb));
			else if (data.mod === "[<= Пред. стр]") process.nextTick(() => modBrowse(page - 1, category, version, search, cbFileBrowse, endCb));
			else if (data.mod === "[След. стр =>]") process.nextTick(() => modBrowse(page + 1, category, version, search, cbFileBrowse, endCb));
			else if (data.mod === "[Назад к поиску]") process.nextTick(() => searchScreen(cbFileBrowse, endCb));
			else fileBrowse(mods.find(e => e.title === data.mod.split("|")[0]), !cbFileBrowse, function(link) {
				if (cbFileBrowse) cbFileBrowse(link);
				process.nextTick(() => modBrowse(page, category, version, search, cbFileBrowse, endCb));
			})
		});
	}

	curse.searchModCategory(category, version, page, search, function(mods) {
		clear();
		showList(mods);
	});
}

function fileBrowse(mod, dl, cb) {
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

			const mod = files.find(e => e.title === data.file).rawLink;

			if (dl) {
				clear();
				console.log("Скачиваю: " + data.file + "\nСюда: " + filename);

				curse.downloadMod(mod, filename, cb);
			} else {
				clear();
				console.log("Получаю ссылку...");
				curse.fetchCDNLink(mod, cb);
			}
		});
	});
}

function modpackScreen() {
	clear();

	console.log("Тут вы можете экспортировать и импортировать \"модпаки\"");
	console.log("Конкретно в ЭТОЙ версии это просто список модов .mpackf файле которые требуется скачать");
	console.log("Как юзать:".green);
	console.log("  1. Жмете 'Экспортировать'");
	console.log("  2. Выбираете нужные вам моды");
	console.log("  3. Когда закончите в категориях жмете [Экспортировать]");
	console.log("  4. В папке modpacks появится файл <случайные символы>.mpackf");
	console.log("  5. Переименовываете его как хотите и кидаете куда хотите");
	console.log("Как импортировать:".green);
	console.log("  1. Кидаете модпак в папку modpacks");
	console.log("  2. Жмете Импортировать и выбираете ваш файл");
	console.log("  3. Ждете пока скачаются все моды. Они будут в папке mods");

	inquirer.prompt([
		{
			type: "list",
			name: "btn",
			choices: ["Экспортировать", "Импортировать", "Назад"],
			suffix: "",
			prefix: "",
			message: " "
		}
	]).then(function(data) {
		if (data.btn === "Экспортировать") {
			let links = [];

			versionScreen(e => links.push(e), function() {
				clear();
				console.log("Экспортирую...");
				fs.writeFileSync("../modpacks/" + Math.random().toString(36).slice(2) + ".mpackf", links.join("\n"));
				console.log("Готово ;3");
			});
		} else if (data.btn === "Импортировать") {
			clear();

			const files = fs.readdirSync("../modpacks");

			inquirer.prompt([{
				type: "list",
				name: "file",
				choices: files,
				suffix: "",
				prefix: "",
				message: "Файл модпака:"
			}, {
				type: "confirm",
				name: "check",
				message: "Проверить подписи модов?"
			}]).then(function(data, cb) {
				const modpack = fs.readFileSync("../modpacks/" + data.file);
				const files = modpack.toString().split("\n").filter(e => e);

				clear();

				async.mapSeries(files, function(link, cb) {
					const filename = link.split("/").pop();

					console.log("Качаю:", filename);

					https.get(link, s => s.pipe(fs.createWriteStream("../mods/" + filename)).on("close", cb));
				}, function() {
					if (data.check) startSignCheck();
				});
			});
		}
		else process.nextTick(() => mainScreen());
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