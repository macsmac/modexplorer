require("./setup");

const cli = require("./cli"),
      mxpUtils = require("./mxputils"),
      curse = require("./curseforge"),
      size = require("window-size"),
      async = require("async"),
      opn = require("opn"),
      fs = require("fs"),
      zip = require("./unzip"),
      signature = require("./signature"),
      google = require("google"),
      leven = require("leven");

const MXP_URL = "https://ru-minecraft.ru/fayly-dlya-minecraft/49994-modexplorer-kachaem-mody-iz-konsolki.html";
const MXP_LOGO = fs.readFileSync("../config/welcometext.txt").toString();

require("colors");

let version, category;

const locales = require("../config/locales");
let _categories = {};

Object.keys(curse.categories).map(e => _categories[curse.categories[e].locale] = curse.categories[e].url);

cli.addScreen("main", function(data, cb) {
	console.log(MXP_LOGO.green);
	console.log("=".repeat(size.width));
	cli.busy(true);
	cli.list(null, [
		{
			text: locales.search_mods,
			data: "search_mods"
		}, {
			text: locales.signature_check,
			data: "signature_check"
		}, {
			text: "Типа справочка",
			data: "help"
		}
	], function(err, data) {
		cli.busy(false);
		cb();

		if (data === "search_mods") cli.switchScreen("versions", {}, true);
		else if (data === "signature_check") cli.switchScreen("signature_check", {}, true);
		else if (data === "help") {
			cli.switchScreen("main", {}, true);
			opn(MXP_URL);
		}
	});
});

cli.addScreen("versions", function(data, cb) {
	cli.clear();
	cli.busy(true);
	cli.list(locales.choose_version, Object.keys(curse.versions), function(err, data) {
		version = curse.versions[data];

		cli.busy(false);
		cb();
		cli.switchScreen("categories", {}, true);
	});
});

cli.addScreen("categories", function(data, cb) {
	cli.busy(true);
	cli.list(locales.choose_category, [locales.search_btn, ...Object.keys(_categories), locales.back_to_menu], function(err, data) {
		cli.busy(false);
		cb();
		
		if (data === locales.back_to_menu) return cli.switchScreen("main", {}, true);
		else if (data === locales.search_btn) return cli.switchScreen("search");

		category = _categories[data];
		
		cli.switchScreen("mods", {
			category: category,
			version: version,
			page: 1
		});
	});
});

cli.addScreen("mods", function(data, cb) {
	cli.busy(true);

	console.log("Загружаю...");

	function handlerFn(err, results) {
		cli.clear();
		cli.list(locales.mods, [...results.map(e => ({
			text: e.title.green + " " + e.description.slice(0, size.width - e.title.length - 5),
			data: e.rawLink
		})), {
			text: locales.prev_page,
			data: "prev_page"
		}, {
			text: locales.next_page,
			data:"next_page"
		}, {
			text: locales.back,
			data: "back"
		}], function(err, link) {
			cli.busy(false);
			if (link === "prev_page") {
				data.page--;
				cli.switchScreen("mods", data, cb);
			} else if (link === "next_page") {
				data.page++;
				cli.switchScreen("mods", data, cb);
			} else if (link === "back") {
				cb();
			} else {
				cli.switchScreen("files", { link }, (result) => cli.switchScreen("mod_download", result, () => cli.prevScreen(2)));
			}
		});
	}

	if (!data.search) curse.getCategoryMods(data.category, data.version, data.page, handlerFn);
	else curse.searchMod(data.search, data.page, data.version, null, handlerFn);
});

cli.addScreen("files", function(data, cb) {
	cli.busy(true);

	console.log(locales.downloading);

	curse.getAllFiles(data.link, version, function(err, results) {
		cli.clear();
		cli.list(locales.choose_file, results.map(e => ({
			text: e.title,
			data: [e.fileID, e.title]
		})), function(err, result) {
			cli.busy(false);
			cb({
				link: data.link + "/download/" + result[0],
				title: result[1]
			});
		});
	});
}, false);

cli.addScreen("mod_download", function(data, cb) {
	console.log(locales.fetching_link);
	curse.fetchCDNLink(data.link, function(err, link) {
		console.log(locales.downloading + ":", link);
		mxpUtils.downloadFile(link, "../mods/" + mxpUtils.appendJar(data.title), cb);
	});
}, false);

cli.addScreen("search", function(data, cb) {
	console.log(MXP_LOGO.green);
	console.log("=".repeat(size.width));
	console.log(locales.enter_to_quit.gray);
	cli.input(locales.search, function(err, data) {
		if (data.trim() === "") return cb();

		cli.switchScreen("mods", {
			page: 1,
			search: data,
			version
		}, cb);
	});
});

cli.addScreen("signature_check", function(data, cb) {
	console.log(MXP_LOGO.green);
	console.log("=".repeat(size.width));
	cli.list(null, [ locales.start, locales.back_to_menu ], function(err, data) {
		if (data === locales.back_to_menu) return cli.switchScreen("main", {}, true);

		cb();
		cli.switchScreen("signature_check_start", {}, true);
	});
});

cli.addScreen("signature_check_start", function(data, cb) {
	/*
	TODO: Add locales
	*/
	console.log("== Проверка подписей ==".green);
	console.log("Читаю директорию");
	fs.readdir("../mods", function(err, files) {
		files = files.filter(e => e.endsWith(".jar"));
		console.log("Нашел", files.length, "файлов");

		console.log("Начинаю проверку подписей");
		// async.mapSeries
		async.eachSeries(files, function(file, cb) {
			zip.getFile("../mods/" + file, ["mcmod.info", "cccmod.info"], function(content) {
				if (content != undefined) content = content.toString();

				if (!content) return cb(console.log("Не нашел mcmod.info у", file, "- пропускаем"));

				let modinfo = JSON.parse(content.replace(/(\r\n|\n|\r)/gm,""));
					
				if (modinfo[0]) modinfo = modinfo[0];
				else modinfo = modinfo.modList[0];

				if (!modinfo.name) return cb(console.log("Нет названия у", file, "- сжигаем на костре"));

				curse.searchMod(modinfo.name, 1, curse.versions[modinfo.mcversion], modinfo.version, function(err, link) {
					if (!link || !link.endsWith(".jar")) {
						google("curseforge " + modinfo.name, function(err, res) {
							const project = res.links.find(e => 
								leven(e.link.split("/").pop().toLowerCase(), modinfo.name.toLowerCase()) < 5);
							if (!project) return console.log("Не смог найти", file, "на CurseForge");

							const rawLink = "https://curseforge.com/minecraft/mc-mods/" + project.link.split("/").pop();

							curse.getAllFiles(rawLink, curse.versions[modinfo.mcversion], function(err, files) {
								const tfile = files.find(e => e.title.toLowerCase().indexOf(modinfo.version.toLowerCase()) !== -1);

								if (!tfile) return console.log("Не смог найти нужную версию", file);

								curse.fetchCDNLink(rawLink + "/download/" + tfile.fileID, (e, l) => check(l));
							});
						});
					} else check(link);

					function check(link) {
						signature.generateMD5("../mods/" + file, function(err, localSignature) {
							signature.URLgenerateMD5(link, function(err, curseSignature) {
								if (localSignature === curseSignature) {
									console.log(file, "- Подпись верна".green);
								} else {
									console.log(file.bgWhite.red + " - Подпись неверна".bgWhite.red);
								}

								cb();
							});
						});
					}
				});
			});
		}/* , function() {} */);
	});
});

cli.clear();
cli.switchScreen("main");