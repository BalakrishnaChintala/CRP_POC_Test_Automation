'use strict';

var gulp = require('gulp');
var angularProtractor = require('gulp-angular-protractor');

    gulp.task('CRP-Automation', function(callback) {
        gulp
            .src(['./*.js']) 
            .pipe(angularProtractor({      
                'configFile': 'conf.js',
                'webDriverUpdate': {
                    args: ['--versions.chrome', '2.28']
                },
                'webDriverStart': {
                    args: ['--versions.chrome', '2.28']
                },
            }))
            .on('error', function(e) {
                console.log(e);
            })
            .on('end', callback);

});
