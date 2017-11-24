const crypto = require("crypto");
const memfs = require("fs");
const https = require("https");
const Volume = require("memfs").Volume;
const mfs = new Volume();
const fs = require("fs");

function md5(content) {
	return crypto.createHash("md5").update(content).digest("hex");
}

function generateMD5(path, cb) {
	fs.readFile(path, function(err, content) {
		cb(err, !err ? md5(content) : null);
	});
}

function URLgenerateMD5(url, cb) {
	const tmp = "/" + Math.random().toString(36).slice(2);

	https.get(url, function(stream) {
		stream.pipe(mfs.createWriteStream(tmp))
			.on("close", function() {
				mfs.readFile(tmp, function(err, content) {
					mfs.reset();
					cb(err, !err ? md5(content) : null);
				});
			});
	});
}

module.exports = { generateMD5, URLgenerateMD5 };