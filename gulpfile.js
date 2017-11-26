const gulp = require("gulp");
const zip = require("gulp-zip");
const version = require("./package").version;

gulp.task("zip", function() {
	gulp.src(["./src/**.**", "./package.json", "./runtime/**/*", "./config/*.**", "./start.bat"], { base: "." })
		.pipe(zip("ModExplorer v" + version + ".zip"))
		.pipe(gulp.dest("./"));
});

gulp.task("default", ["zip"]);