var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = {};

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    this.warningTime = 1400;
    this.dangerTime = 1900;

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
        if (initialColumnSettings.warningTime) {
            this.warningTime = initialColumnSettings.warningTime;
        }
        if (initialColumnSettings.dangerTime){
            this.dangerTime = initialColumnSettings.dangerTime;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": true,
        "pending": false,
        "sessionId": "65eb018858b50a9a632d043a3f188231",
        "instanceId": 9264,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1565679646656,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tree - Form submission canceled because the form is not connected",
                "timestamp": 1565679687974,
                "type": ""
            }
        ],
        "screenShotFile": "002500d0-00dc-003c-006f-009900d5007b.png",
        "timestamp": 1565679642370,
        "duration": 51901
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": true,
        "pending": false,
        "sessionId": "7a3ee883b36aa45e12be6b5214ce9610",
        "instanceId": 1736,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1565691004702,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tree - Form submission canceled because the form is not connected",
                "timestamp": 1565691052567,
                "type": ""
            }
        ],
        "screenShotFile": "00510031-0068-00af-0085-001e0079002a.png",
        "timestamp": 1565691001628,
        "duration": 57818
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "6890cfce93de71a2068d26d7cfefd75e",
        "instanceId": 4708,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: No element found using locator: by.buttonText(\"Submit\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.buttonText(\"Submit\")\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:132:22)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:33:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (internal/modules/cjs/loader.js:643:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566533845282,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tocView - Form submission canceled because the form is not connected",
                "timestamp": 1566533887048,
                "type": ""
            }
        ],
        "screenShotFile": "00ea007d-00a6-00c4-009f-00d4001f00fc.png",
        "timestamp": 1566533842780,
        "duration": 47436
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "188646a65ad42f76c4723847e71ca4a0",
        "instanceId": 16556,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:136:21)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:35:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (internal/modules/cjs/loader.js:643:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566536897615,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tocView - Form submission canceled because the form is not connected",
                "timestamp": 1566536939386,
                "type": ""
            }
        ],
        "screenShotFile": "00670019-00cc-00bf-00fe-00ab00900079.png",
        "timestamp": 1566536895110,
        "duration": 48686
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "d1b1595edb85e685f0ab3e652bbbb36c",
        "instanceId": 15984,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:136:21)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:35:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (internal/modules/cjs/loader.js:643:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566538919219,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tocView - Form submission canceled because the form is not connected",
                "timestamp": 1566538960671,
                "type": ""
            }
        ],
        "screenShotFile": "00650026-00a0-00d0-003f-00e000a20076.png",
        "timestamp": 1566538916641,
        "duration": 48434
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "34d92f57fec4e10d1db22f59368885d2",
        "instanceId": 1392,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:137:21)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:35:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (internal/modules/cjs/loader.js:643:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566542777888,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tocView - Form submission canceled because the form is not connected",
                "timestamp": 1566542819513,
                "type": ""
            }
        ],
        "screenShotFile": "003f00a8-00a9-008c-0059-003f00a30037.png",
        "timestamp": 1566542774863,
        "duration": 49048
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "add01e19a744cb16ad8b1402321a3cf5",
        "instanceId": 1352,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //span[contains(text(), \"Auto assign\")])\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:138:21)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:35:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (internal/modules/cjs/loader.js:643:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566542984472,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tocView - Form submission canceled because the form is not connected",
                "timestamp": 1566543025976,
                "type": ""
            }
        ],
        "screenShotFile": "00bf002c-000d-002e-008c-0011002200dd.png",
        "timestamp": 1566542982030,
        "duration": 67341
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": true,
        "pending": false,
        "sessionId": "d89714e9a6ebe6fcb5d3388cfef3a2dd",
        "instanceId": 15968,
        "browser": {
            "name": "chrome"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566801180598,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/tocView - Form submission canceled because the form is not connected",
                "timestamp": 1566801222367,
                "type": ""
            }
        ],
        "screenShotFile": "00b100a9-00c4-0031-00a2-00f700f20076.png",
        "timestamp": 1566801177794,
        "duration": 51099
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "94d3396d5e2234df528ef90d7fa1600d",
        "instanceId": 14024,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=76.0.3809.100)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'BCHINTAR90BZ6KT', ip: '10.96.141.16', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_221'\nDriver info: driver.version: unknown"
        ],
        "trace": [
            "NoSuchWindowError: no such window: target window already closed\nfrom unknown error: web view not found\n  (Session info: chrome=76.0.3809.100)\nBuild info: version: '3.141.59', revision: 'e82be7d358', time: '2018-11-14T08:25:53'\nSystem info: host: 'BCHINTAR90BZ6KT', ip: '10.96.141.16', os.name: 'Windows 10', os.arch: 'amd64', os.version: '10.0', java.version: '1.8.0_221'\nDriver info: driver.version: unknown\n    at Object.checkLegacyResponse (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)\nFrom: Task: WebDriver.executeScript()\n    at thenableWebDriverProxy.schedule (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at thenableWebDriverProxy.executeScript (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:878:16)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\by.js:191:35\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1068:28\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\nFrom: Task: WebDriver.call(function)\n    at thenableWebDriverProxy.call (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:901:23)\n    at thenableWebDriverProxy.findElementsInternal_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1068:17)\n    at thenableWebDriverProxy.findElements (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1043:19)\n    at Object.findElementsOverride (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\locators.js:384:31)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:156:40\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at ReusableMethodsPage.dropdownTitle (C:\\CRP_POC_Test_Automation\\ReusableMethods.js:5:16)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:52:25)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:35:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (internal/modules/cjs/loader.js:643:32)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1566905687697,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/home - Form submission canceled because the form is not connected",
                "timestamp": 1566905697200,
                "type": ""
            }
        ],
        "timestamp": 1566905685106,
        "duration": 12519
    },
    {
        "description": "create asemby as new application|CRP Create TOC",
        "passed": false,
        "pending": false,
        "sessionId": "c1c43e85cbde1fd52a91c1d01f90cef9",
        "instanceId": 18232,
        "browser": {
            "name": "chrome"
        },
        "message": [
            "Failed: No element found using locator: by.cssContainingText(\"option\", \"Cetrizine-263\")"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: by.cssContainingText(\"option\", \"Cetrizine-263\")\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27\n    at ManagedPromise.invokeCallback_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.<computed> [as click] (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at ReusableMethodsPage.dropdownOption (C:\\CRP_POC_Test_Automation\\ReusableMethods.js:10:13)\n    at UserContext.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:51:25)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)\nFrom: Task: Run it(\"create asemby as new application\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2728:9\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at processTicksAndRejections (internal/process/task_queues.js:85:5)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:36:5)\n    at addSpecsToSuite (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\CRP_POC_Test_Automation\\spec.js:3:1)\n    at Module._compile (internal/modules/cjs/loader.js:777:30)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:788:10)\n    at Module.load (C:\\CRP_POC_Test_Automation\\node_modules\\coffeescript\\lib\\coffee-script\\register.js:45:36)\n    at Function.Module._load (internal/modules/cjs/loader.js:556:12)\n    at Module.require (internal/modules/cjs/loader.js:683:19)\n    at require (internal/modules/cjs/helpers.js:16:16)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine\\lib\\jasmine.js:93:5\n    at Array.forEach (<anonymous>)\n    at Jasmine.loadSpecs (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine\\lib\\jasmine.js:92:18)\n    at Jasmine.execute (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine\\lib\\jasmine.js:197:8)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\frameworks\\jasmine.js:132:15\n    at Function.promise (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:682:9)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\frameworks\\jasmine.js:104:14\n    at _fulfilled (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:834:54)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:863:30\n    at Promise.promise.promiseDispatch (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:796:13)\n    at C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:556:49\n    at runSingle (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:137:13)\n    at flush (C:\\Users\\bchintal\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\q\\q.js:125:13)\n    at processTicksAndRejections (internal/process/task_queues.js:75:11)"
        ],
        "browserLogs": [
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/vendor.js 99565:20 \"Could not find HammerJS. Certain Angular Material components may not work correctly.\"",
                "timestamp": 1567492081871,
                "type": ""
            },
            {
                "level": "WARNING",
                "message": "http://10.96.153.168:4200/home - Form submission canceled because the form is not connected",
                "timestamp": 1567492090101,
                "type": ""
            }
        ],
        "screenShotFile": "009100cb-00e1-00de-006b-00c4004900b6.png",
        "timestamp": 1567492079172,
        "duration": 10978
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

