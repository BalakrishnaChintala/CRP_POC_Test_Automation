var HtmlReporter = require('protractor-beautiful-reporter');
var Jasmine2HtmlReporter = require('protractor-jasmine2-html-reporter');

exports.config = {
    //seleniumAddress: 'http://localhost:4444/wd/hub',
    seleniumServerJar: './node_modules/selenium-standalone-jar/bin/selenium-server-standalone-3.141.59.jar',
    
     specs: ['spec.js'],
    framework: 'jasmine2',

    jasmineNodeOpts: {
        defaultTimeoutInterval: 2500000
        },

        onPrepare: function() {
            jasmine.getEnv().addReporter(new HtmlReporter({
                baseDirectory: 'TestReports/screenshots'
             }).getJasmine2Reporter());
             {
             var jasmineReporters = require('jasmine-reporters');
             jasmine.getEnv().addReporter(new jasmineReporters.TeamCityReporter());
         }
        }
     }

     