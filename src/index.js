const cli = require("./cli"),
      mxpUtils = require("./mxputils"),
      curse = require("./curseforge"),
      size = require("window-size");

require("colors");

let version, category;

const buttons = require("../config/buttons");
let _categories = {};

Object.keys(curse.categories).map(e => _categories[curse.categories[e].locale] = curse.categories[e].url);

cli.addScreen("main", function(data, cb) {
	cli.busy(true);
	cli.list(null, [
		{
			text: buttons.search_mods,
			data: "search_mods"
		}
	], function(err, data) {
		cli.busy(false);
		cb();

		if (data === "search_mods") cli.switchScreen("versions", {}, true);
	});
});

cli.addScreen("versions", function(data, cb) {
	cli.clear();
	cli.busy(true);
	cli.list(buttons.choose_version, Object.keys(curse.versions), function(err, data) {
		version = curse.versions[data];

		cli.busy(false);
		cb();
		cli.switchScreen("categories", {}, true);
	});
});

cli.addScreen("categories", function(data, cb) {
	cli.busy(true);
	cli.list(buttons.choose_category, [...Object.keys(_categories), buttons.back_to_menu], function(err, data) {
		cli.busy(false);
		cb();
		
		if (data === buttons.back_to_menu) return cli.switchScreen("main", {}, true);

		category = _categories[data];
		
		cli.switchScreen("mods", {
			category: category,
			version: version,
			page: 1
		}, true);
	});
});

cli.addScreen("mods", function(data, cb) {
	cli.busy(true);

	console.log("Загружаю...");

	curse.getCategoryMods(data.category, data.version, data.page, function(err, results) {
		cli.busy(false);
		cli.clear();
		cb();
		cli.list(buttons.mods, [...results.map(e => ({
			text: e.title.green + " " + e.description.slice(0, size.width - e.title.length - 5),
			data: e.rawLink
		})), {
			text: buttons.prev_page,
			data: "prev_page"
		}, {
			text: buttons.next_page,
			data:"next_page"
		}, {
			text: buttons.back_to_categories,
			data: "back_to_categories"
		}], function(err, link) {
			if (link === "prev_page") {
				data.page--;
				cli.switchScreen("mods", data, true);
			} else if (link === "next_page") {
				data.page++;
				cli.switchScreen("mods", data, true);
			} else if (link === "back_to_categories") {
				cli.switchScreen("categories", {}, true);
			} else {
				cli.switchScreen("files", { link }, (result) => 
					cli.switchScreen("mod_download", result, () => cli.switchScreen("mods", data, cb)));
			}
		});
	});
});

cli.addScreen("files", function(data, cb) {
	cli.busy(true);

	console.log("Загружаю...");

	curse.getAllFiles(data.link, version, function(err, results) {
		cli.clear();
		cli.list(buttons.choose_file, results.map(e => ({
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
});

cli.addScreen("mod_download", function(data, cb) {
	console.log("Получаю ссылку...");
	curse.fetchCDNLink(data.link, function(err, link) {
		console.log("Загружаю:", link);
		mxpUtils.downloadFile(link, "../mods/" + mxpUtils.appendJar(data.title), cb);
	});
});

cli.clear();
cli.switchScreen("main");