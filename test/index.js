const assert = require("assert");

const CurseForge = require("../src/curseforge");
const signature = require("../src/signature");

/*
  CurseForge tests
*/

describe("CurseForge", function() {
	it("Should search mods", function(cb) {
		const MODNAME = "applied energistics 2";
		const VERSION = CurseForge.versions["1.7.10"];

		CurseForge.searchMod(MODNAME, 1, VERSION, null, function(err, results) {
			assert.equal(MODNAME, results[0].title.toLowerCase());
			cb();
		});
	});
	it("Should search version mod and return CDN link", function(cb) {
		const MODNAME = "applied energistics 2";
		const VERSION = CurseForge.versions["1.7.10"];
		const MODVERSION = "rv2-beta-33";
		const CDNLINK = "https://addons-origin.cursecdn.com/files/2236/692/appliedenergistics2-rv2-beta-33.jar";

		CurseForge.searchMod(MODNAME, 1, VERSION, MODVERSION, function(err, link) {
			assert.equal(CDNLINK, link);
			cb();
		});
	});
	it("Should search mods in category", function(cb) {
		const CATEGORY = CurseForge.categories["addons"].url;
		const VERSION = CurseForge.versions["1.7.10"];
		const MODNAME = "chisel";

		CurseForge.getCategoryMods(CATEGORY, VERSION, 1, function(err, results) {
			assert.equal(MODNAME, results[0].title.toLowerCase());
			cb();
		});
	});
});

/*
  Signature tests
*/

describe("Signature", function() {
	it("Should generate signature from local file", function(cb) {
		const FILE = "./test/files/test.txt";
		const SIGNATURE = "6cd3556deb0da54bca060b4c39479839";

		signature.generateMD5(FILE, function(err, signature) {
			assert.equal(SIGNATURE, signature);
			cb();
		});
	});
	it("Should generate signature from URL", function(cb) {
		const URL = "https://pastebin.com/raw/T9qXR9FD";
		const SIGNATURE = "6cd3556deb0da54bca060b4c39479839";

		signature.URLgenerateMD5(URL, function(err, signature) {
			assert.equal(SIGNATURE, signature);
			cb();
		});
	});
});