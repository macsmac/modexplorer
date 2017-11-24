const BASE_URI = "https://curseforge.com";

const cloudscraper = require("cloudscraper"),
	  cheerio = require("cheerio");

const CurseForge = {
	/**
	 * Function to get mod's CDN link
	 * @param {string} rawLink - Link to main download link
	 * @param {function} cb
	 */
	fetchCDNLink: function(rawLink, cb) {
		cloudscraper.get(rawLink + "/file", function(err, req, body) {
			if (err) return cb(err);
			cb(null, req.request.href);
		});
	},
	/**
	 * Function to fetch $ from curseforge page
	 * @param {string} link - curseforge page uri
	 * @param {function} cb
	 */
	"$fetch": function(link, cb) {
		cloudscraper.get(link, function(err, req, body) {
			try {
				if (err) return cb(err);
				cb(null, cheerio.load(body));
			} catch (e) { cb(e); }
		});
	},
	/**
	 * Function to get search results from page
	 * @param {object} $ - stuff lol
	 */
	fetchPageResults: function($) {
		if (!$) return;

		let result = [];

		const titles = $(".list-item__title").map((i, e) => e.children[0].data.trim()).toArray();
		const descriptions = $(".list-item__description > p").map((i, e) => e.children[0].data.trim()).toArray();
		const rawLinks = $(".list-item__details > a").map((i, e) => BASE_URI + e.attribs.href).toArray();

		titles.forEach((t, i) => { result[i] = {
			title: t,
			description: descriptions[i],
			rawLink: rawLinks[i]
		}});

		return result;
	},
	/**
	 * Function to get files id from mod's project page
	 * @param {object} $
	 */
	fetchProjectFiles: function($) {
		if (!$) return;

		return $(".button.button--download.download-button.mg-r-05").map(function(i, e) {
			const val = JSON.parse(e.attribs["data-action-value"]);
			return { 
				title: val.FileName, 
				fileID: val.ProjectFileID 
			};
		});
	},
	/**
	 * Function to get all mods from category
	 * @param {string} category - Category name
	 * @param {string} version - Game version
	 * @param {number} page - Page number,
	 * @param {function} cb
	 */
	getCategoryMods: function(category, version, page, cb) {
		CurseForge.$fetch(
			BASE_URI + "/minecraft/mc-mods/" + category
			+ "?filter-game-version=" + version
			+ "&page=" + page,
			(err, $) => cb(err, CurseForge.fetchPageResults($))
		);
	},
	/**
	 * Function to search mods
	 * @param {string} query - Search query
	 * @param {number} page - Page number
	 * @param {string} version - Game version
	 * @param {string} modVersion - Mod version,
					   if not null will return CDN link
	 * @param {function} cb
	 */
	searchMod: function(query, page = 1, version, modVersion = null, cb) {
		CurseForge.$fetch(
			BASE_URI + "/minecraft/mc-mods/search"
			+ "?search=" + query
			+ "&filter-game-version=" + version
			+ "&minecraft-mc-mods-page=" + page,
			function(err, $) {
				const results = CurseForge.fetchPageResults($);

				if (!results) return cb(err);
				if (!modVersion) return cb(err, results);

				const mod = results.find(e => e.title.toLowerCase().indexOf(query.toLowerCase()) !== -1);

				CurseForge.getAllFiles(mod.rawLink, version, function(err, files) {
					const file = files.find(e => e.title.indexOf(modVersion) !== -1);

					if (file) {
						CurseForge.fetchCDNLink(mod.rawLink + "/download/" + file.fileID, cb);
					} else cb(null);
				});
			}
		);	
	},
	/**
	 * Function to fetch all the files from project page
	 * @param {string} link - Link to project page
	 * @param {string} version - Game version
	 * @param {function} cb
	 */
	getAllFiles: function(link, version, cb, _pgc, _pg = 1, _list = []) {
		CurseForge.$fetch(link + "/files?filter-game-version=" + version + "&page=" + _pg, function(err, $) {
			if (err) return cb(err);

			const files = CurseForge.fetchProjectFiles($);
			const newPgc = files[0].title;

			if (newPgc === _pgc) return cb(null, _list);

			[].push.apply(_list, files);

			CurseForge.getAllFiles(link, version, cb, newPgc, _pg + 1, _list);
		});
	},
	versions: require("../config/versions"),
	categories: require("../config/categories")
}

module.exports = CurseForge;