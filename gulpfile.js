var gulp = require("gulp"),
    jade = require('gulp-jade'),
    sass = require('gulp-sass'),
    prettify = require('gulp-prettify'),
    wiredep = require('wiredep').stream,
    useref = require('gulp-useref'),
    uglify = require('gulp-uglify'),
    clean = require('gulp-clean'),
    gulpif = require('gulp-if'),
    filter = require('gulp-filter'),
    size = require('gulp-size'),
    imagemin = require('gulp-imagemin'),
    concatCss = require('gulp-concat-css'),
    minifyCss = require('gulp-minify-css'),
    browserSync = require('browser-sync'),
    gutil = require('gulp-util'),
    ftp = require('vinyl-ftp'),
    spritesmith = require('gulp.spritesmith'),
    data = require('gulp-data'),
    fs = require("fs");
    reload = browserSync.reload;

// ====================================================
// ====================================================
// ============== Локальная разработка APP ============

// Компилируем Jade в html

gulp.task('jade', function() {

    gulp.src('app/_dev/templates/pages/*.jade')
        .pipe(data(function(file) {
            return JSON.parse(fs.readFileSync('./app/_dev/templates/base/settings.json'));
        }))
        .pipe(jade({
            pretty: true,
        }))
        .on('error', log)
        .pipe(gulp.dest('app/'))
        .pipe(reload({stream: true}));
});
// Компиляция  Sass в CSS
gulp.task('sass', function () {
    gulp.src('app/_dev/styles/**/*.scss')
        .pipe(sass({
            includePaths: [
                'app/bower_components/foundation/scss'
            ]
        }).on('error', sass.logError))
        .pipe(gulp.dest('app/styles'))
        .pipe(reload({stream: true}));
});
// Запускаем локальный сервер (только после компиляции jade)
gulp.task('server', function () {
    browserSync({
        notify: false,
        port: 9000,
        server: {
            baseDir: 'app'
        }
    });
});

// Подключаем ссылки на bower 
gulp.task('wiredep', function () {
    gulp.src('app/_dev/templates/layouts/*.jade')
        .pipe(wiredep({
            ignorePath: /^(\.\.\/)*\.\./
        }))
        .pipe(gulp.dest('app/_dev/templates/layouts/'))
});

// слежка и запуск задач 
gulp.task('watch', function () {
    gulp.watch('app/_dev/templates/**/*.jade', ['jade']);
    gulp.watch('app/_dev/templates/**/*.json', ['jade']);
    gulp.watch('bower.json', ['wiredep']);
    gulp.watch('app/_dev/styles/**/*.scss', ['sass']);
    gulp.watch([
        'app/*.html',
        'app/scripts/**/*.js',
        'app/styles/**/*.css'
    ]).on('change', reload);
});

gulp.task('sprite', function() {
    var spriteData =
        gulp.src('app/images/sprite2/*.*') // путь, откуда берем картинки для спрайта
            .pipe(spritesmith({
                imgName: 'sprite.png',
                cssName: 'sprite.css',
                imgPath:'/images/sprite.png'
            }));

    spriteData.img.pipe(gulp.dest('app/images/')); // путь, куда сохраняем картинку
    spriteData.css.pipe(gulp.dest('app/styles/')); // путь, куда сохраняем стили
});

// Задача по-умолчанию 
gulp.task('default', ['server', 'watch']);


// ====================================================
// ====================================================
// ===================== Функции ======================

// Более наглядный вывод ошибок
var log = function (error) {
    console.log([
        '',
        "----------ERROR MESSAGE START----------",
        ("[" + error.name + " in " + error.plugin + "]"),
        error.message,
        "----------ERROR MESSAGE END----------",
        ''
    ].join('\n'));
    this.end();
}

// ====================================================
// ====================================================
// =============== Важные моменты  ====================
// gulp.task(name, deps, fn) 
// deps - массив задач, которые будут выполнены ДО запуска задачи name
// внимательно следите за порядком выполнения задач!


// ====================================================
// ====================================================
// ================= Сборка DIST ======================

// Очистка папки
gulp.task('clean', function () {
    return gulp.src('dist')
        .pipe(clean());
});

// Переносим HTML, CSS, JS в папку dist 
gulp.task('useref', function () {
    var assets = useref.assets();
    return gulp.src('app/*.html')
        .pipe(assets)
        .pipe(gulpif('*.js', uglify()))
        .pipe(gulpif('*.css', minifyCss({compatibility: 'ie8'},{processImportFrom:["!fonts.googleapis.com"]})))
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('dist'));
});

// Перенос шрифтов
gulp.task('fonts', function() {
    gulp.src('app/fonts/*')
        .pipe(filter(['*.eot','*.svg','*.ttf','*.woff','*.woff2']))
        .pipe(gulp.dest('dist/fonts/'))
});

// Картинки
gulp.task('images', function () {
    return gulp.src('app/images/**/*')
        .pipe(imagemin({
            progressive: true,
            interlaced: true
        }))
        .pipe(gulp.dest('dist/images'));
});

// Остальные файлы, такие как favicon.ico и пр.
gulp.task('extras', function () {
    return gulp.src([
        'app/*.*',
        '!app/*.html'
    ]).pipe(gulp.dest('dist'));
});
//Перемежение jquery
gulp.task('jquery', function () {
    return gulp.src([
        'app/bower_components/jquery/dist/jquery.min.js'
    ]).pipe(gulp.dest('dist/js'));
});
// Сборка и вывод размера содержимого папки dist
gulp.task('dist', ['useref', 'images', 'fonts', 'extras', 'jquery'], function () {
    return gulp.src('dist/**/*').pipe(size({title: 'build'}));
});

// Собираем папку DIST (только после компиляции Jade)
gulp.task('build', ['clean', 'jade'], function () {
    gulp.start('dist');
});

// Проверка сборки 
gulp.task('server-dist', function () {
    browserSync({
        notify: false,
        port: 8000,
        server: {
            baseDir: 'dist'
        }
    });
});


// ====================================================
// ====================================================
// ===== Отправка проекта на сервер ===================

gulp.task( 'deploy', function() {

    var conn = ftp.create( {
        host:     'pavelshmidt.ru',
        user:     'ct58641_pavel',
        password: 'kgtu2011',
        parallel: 10,
        log: gutil.log
    } );

    var globs = [
        'dist/**/*'
    ];

    return gulp.src(globs, { base: 'dist/', buffer: false })
        .pipe(conn.dest( 'work2/public_html/'));

});