const categories = require("../config/categories.json");
const versions = require("../config/versions.json");

const cloudscraper = require("cloudscraper");
const cheerio = require("cheerio");
const https = require("https");
const fs = require("fs");

const BASE_URI = "https://curseforge.com/minecraft/";

function downloadMod(link, path, cb) {
	fetchCDNLink(link, function(link) {
		https.get(link, function(stream) {
			stream.pipe(fs.createWriteStream(path)).on("close", cb);
		});
	});
}

function fetchCDNLink(rawLink, cb) {
	cloudscraper.get(rawLink + "/file", function(err, req, body) {
		cb(req.request.href);
	});
}

function $fetch(link, cb) {
	cloudscraper.get(link, function(err, req, body) {
		cb(cheerio.load(body));
	});
}

function fetchPageResults($) {
	let result = [];

	const titles = $(".list-item__title").map((i, e) => e.children[0].data.trim()).toArray();
	const descriptions = $(".list-item__description > p").map((i, e) => e.children[0].data.trim()).toArray();
	const rawLinks = $(".list-item__details > a").map((i, e) => "https://curseforge.com" + e.attribs.href).toArray();

	titles.forEach((t, i) => { result[i] = {
		title: t,
		description: descriptions[i],
		rawLink: rawLinks[i]
	}});

	return result;
}

function fetchFiles($) {
	return $(".button.button--download.download-button.mg-r-05").map(function(i, e) {
		const val = JSON.parse(e.attribs["data-action-value"]);
		return { title: val.FileName, rawLink:  BASE_URI + "mc-mods/applied-energistics-2/download/" + val.ProjectFileID };
	});
}

function searchModCategory(category, version, page, cb) {
	$fetch(BASE_URI + "mc-mods/" + category + "?filter-game-version=" + version + "&page=" + page, $ => cb(fetchPageResults($)));
}

function getAllFiles(link, version, cb, _pgc, _pg = 1, _list = []) {
	$fetch(link + "/files?filter-game-version=" + version + "&page=" + _pg, function($) {
		const files = fetchFiles($);
		
		const newPgc = files[0].title;

		if (newPgc === _pgc) return cb(_list);

		[].push.apply(_list, files);

		getAllFiles(link, version, cb, newPgc, _pg + 1, _list);
	});
}

module.exports = { fetchCDNLink, $fetch, fetchPageResults, fetchFiles, getAllFiles, searchModCategory, downloadMod, BASE_URI, versions, categories };