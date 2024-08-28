const gulp = require('gulp');
const uglify = require('gulp-uglifycss');
const sass = require('gulp-sass')(require('sass'));
const autoprefixer = require('gulp-autoprefixer');

function buildStyles() {
  return gulp.src([
    'sass/styles/css/*.scss',
    '!sass/styles/css/_*.scss',
    ])
    .pipe(autoprefixer({
			cascade: false,
		}))
    .pipe(sass().on('error', sass.logError))
    .pipe(uglify())
    .pipe(gulp.dest('public/styles/css'));
};

gulp.task('icons', function() {
  return gulp.src('node_modules/@fortawesome/fontawesome-free/webfonts/*')
      .pipe(gulp.dest(dist+'/assets/webfonts/'));
});

exports.build = buildStyles;
exports.watch = function () {
  gulp.watch('./sass/styles/css/*.scss', buildStyles);
};

