const fs = require("fs"),
	  https = require("https"),
	  crypto = require("crypto");

const mxpUtils = {
	downloadFile: function(link, dest, cb) {
		https.get(link, 
			stream => 
				stream.pipe(fs.createWriteStream(dest))
					.on("close", () => cb = cb())
					.on("error", cb)
		);
	},
	randStr: function() {
		return Math.random().toString(36).slice(2);
	},
	appendJar: function(file) {
		return file + (file.endsWith(".jar") ? "" : ".jar");
	},
	md5: function(str) {
		return crypto.createHash("md5").update(str).digest("hex");
	}
}

module.exports = mxpUtils;