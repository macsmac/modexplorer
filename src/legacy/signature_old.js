const crypto = require("crypto");
const fs = require("fs");
const https = require("https");

function generateMD5(path, cb) {
	fs.readFile(path, function(err, content) {
		cb(crypto.createHash("md5").update(content).digest("hex"));
	});
}

function URLgenerateMD5(url, cb) {
	const tmp = "../tmp/" + Math.random().toString(36).slice(2);

	https.get(url, function(stream) {
		stream.pipe(fs.createWriteStream(tmp))
			.on("close", function() {
				generateMD5(tmp, function(hash) {
					fs.unlink(tmp, () => cb(hash));
				});
			});
	});
}

module.exports = { generateMD5, URLgenerateMD5 };