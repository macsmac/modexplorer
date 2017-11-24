const fs = require("fs"),
	  https = require("https");

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
	}
}

module.exports = mxpUtils;