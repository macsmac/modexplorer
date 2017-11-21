const unzip = require("unzip-stream");
const Volume = require("memfs").Volume;
const mfs = new Volume();
const fs = require("fs");

function getFile(archive, path, cb) {
	fs.createReadStream(archive)
		.pipe(unzip.Parse())
		.on("entry", function(entity) {
			if (entity.path === path) {
				entity.pipe(mfs.createWriteStream("/" + path))
					.on("close", function() {
						mfs.readFile("/" + path, function(err, content) {
							cb(content);
							mfs.reset();
						});
					}).on("err", () => {});
			} else {
				entity.autodrain();
			}
		});
}

module.exports = { getFile };