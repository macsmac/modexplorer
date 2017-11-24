const cli = require("./cli"),
      mxpUtils = require("./mxputils"),
      curse = require("./curseforge"),
      size = require("window-size");

require("colors");

let version, category;

const locales = require("../config/locales");
let _categories = {};

Object.keys(curse.categories).map(e => _categories[curse.categories[e].locale] = curse.categories[e].url);

cli.addScreen("main", function(data, cb) {
	cli.busy(true);
	cli.list(null, [
		{
			text: locales.search_mods,
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

cli.clear();
cli.switchScreen("main");