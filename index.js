var fs = require('fs');
var path = require('path');
var util = require('util');

var color = require('cli-color');
var mkdirp = require('mkdirp');
var moment = require('moment');

var logLevel = {
	0: {
		color: false,
		name: 'none'
	},
	1: {
		color: color.bgRed,
		name: 'emergency'
	},
	2: {
		color: color.redBright,
		name: 'alert'
	},
	3: {
		color: color.red,
		name: 'critical'
	},
	4: {
		color: color.yellow,
		name: 'error'
	},
	5: {
		color: color.yellowBright,
		name: 'warning'
	},
	6: {
		color: color.blueBright,
		name: 'notice'
	},
	7: {
		color: color.white,
		name: 'info'
	},
	8: {
		color: color.bgWhite.black,
		name: 'debug'
	},
	NONE: 0,
	EMERGENCY: 1, EMER: 1, MRGC: 1, EM: 1,
	ALERT: 2, ALER: 2, ALRT: 2, AL: 2,
	CRITICAL: 3, CRIT: 3, CRTC: 3, CR: 3,
	ERROR: 4, ERRO: 4, RROR: 4, ER: 4,
	WARNING: 5, WARN: 5, WRNG: 5, WA: 5,
	NOTICE: 6, NOTI: 6, NOTC: 6, NO: 6,
	INFO: 7, IN: 7,
	DEBUG: 8, DEBU: 8, DBUG: 8, DE: 8,
	time: {
		color: color.green
	}
};

var compressedTime = {
	0: {
		short: 'YYYY-MM-DD HH:mm:ss',
		long: false,
		startOf: false,
		message: false
	},
	1: {
		short: 'MM-DD HH:mm:ss',
		long: 'YYYY',
		startOf: 'year',
		message: 'current year'
	},
	2: {
		short: 'DD HH:mm:ss',
		long: 'YYYY-MM',
		startOf: 'month',
		message: 'current month'
	},
	3: {
		short: 'HH:mm:ss',
		long: 'YYYY-MM-DD',
		startOf: 'day',
		message: 'current day'
	},
	4: {
		short: 'mm:ss',
		long: 'YYYY-MM-DD HH',
		startOf: 'hour',
		message: 'current hour'
	},
	5: {
		short: 'ss',
		long: 'YYYY-MM-DD HH:mm',
		startOf: 'minute',
		message: 'current minute'
	},
	6: {
		short: false,
		long: 'YYYY-MM-DD HH:mm:ss',
		startOf: 'second',
		message: 'current second'
	},
	NONE: 0,
	YEAR: 1,
	MONTH: 2,
	DAY: 3,
	HOUR: 4,
	MINUTE: 5,
	SECOND: 6
};

var levelMode = {
	0: ['[EMER]','[ALER]','[CRIT]','[ERRO]','[WARN]','[NOTI]','[INFO]','[DEBU]','[TIME]'],
	1: ['[MRGC]','[ALRT]','[CRTC]','[RROR]','[WRNG]','[NOTC]','[INFO]','[DBUG]','[TIME]'],
	2: ['[EMERGENCY]','[ALERT]','[CRITICAL]','[ERROR]','[WARNING]','[NOTICE]','[INFO]','[DEBUG]','[TIME]'],
	3: ['[EM]','[AL]','[CR]','[ER]','[WA]','[NO]','[IN]','[DE]','[TI]'],
	4: ['EMER','ALER','CRIT','ERRO','WARN','NOTI','INFO','DEBU','TIME'],
	5: ['MRGC','ALRT','CRTC','RROR','WRNG','NOTC','INFO','DBUG','TIME'],
	6: ['EMERGENCY','ALERT','CRITICAL','ERROR','WARNING','NOTICE','INFO','DEBUG','TIME'],
	7: ['EM','AL','CR','ER','WA','NO','IN','DE','TI'],
	8: ['1','2','3','4','5','6','7','8','T'],
	9: ['M','A','C','R','W','N','I','D','T'],
	SHORT: 0,
	SMART: 1,
	FULL: 2,
	TINY: 3,
	SHORTNOBRACKETS: 4,
	SMARTNOBRACKETS: 5,
	FULLNOBRACKETS: 6,
	TINYNOBRACKETS: 7,
	NUMBERS: 8,
	SINGLE: 9
};

function applyOption (compare, value, defaultValue) {
	if (value) {
		if (typeof value === 'string') {
			return compare[value.toUpperCase()];
		} else {
			return value;
		}
	} else {
		return defaultValue;
	}
}

function Module (options) {
	// clear console if desired
	if (options.clear) {
		process.stdout.write('\033c');
	}

	// set options
	this.logLevel = applyOption(logLevel, options.logLevel, 8);
	this.consoleLogLevel = applyOption(logLevel, options.consoleLogLevel, this.logLevel);
	this.fileLogLevel = applyOption(logLevel, options.fileLogLevel, this.logLevel);
	this.separatorLogLevel = applyOption(logLevel, options.separatorLogLevel, 7);
	this.compressedTime = applyOption(compressedTime, options.compressedTime, 3);
	this.levelMode = applyOption(levelMode, options.levelMode, 4);
	this.alternativeColumnCount = options.alternativeColumnCount || 100;

	// other options
	this.path = (typeof options.path === 'undefined') ? false : options.path;
	this.prettyJSON = (typeof options.prettyJSON === 'undefined') ? true : options.prettyJSON;
	this.compressedTimeAsSeparator = (typeof options.compressedTimeAsSeparator === 'undefined') ? true : options.compressedTimeAsSeparator;

	// check log path
	if (this.path && !fs.existsSync(this.path)) {
		mkdirp.sync(this.path);
	}

	// create logFile
	if (this.path && this.fileLogLevel) {
		this.logFile = fs.createWriteStream(path.join(this.path, moment().format('YYYY-MM-DD.HH-mm-ss') + '.log'));
	}
}

Module.prototype.separator = Module.prototype.sepa = Module.prototype.se = function(text, sll) {
	// apply separatorLogLevel
	var l = applyOption(logLevel, sll, this.separatorLogLevel);
	
	// log the separator
	if (this.consoleLogLevel >= l) {
		var width = process.stdout.columns || this.alternativeColumnCount;
		var time = this.time();
		if (text) {
			var half = (width-this.level(l-1).length-time.length-text.length+1)/2;
			if (half < 1) {
				half = 1;
			}
			console.log(
				logLevel[l].color(this.level(l-1)) + ' ' +
				time +
				logLevel[l].color((new Array(Math.floor(half)).join('-') +
				text +
				new Array(Math.ceil(half)).join('-')))
			);
		} else {
			console.log(
				logLevel[l].color(this.level(l-1)) + ' ' +
				time +
				logLevel[l].color(new Array(width-this.level(l-1).length-time.length).join('-'))
			);
		}
	}
};

// namespaces
Module.prototype.createNamespace = function(options) {
	var ns = new this.Namespace(options);
	ns.logLevel = this.logLevel;
	ns.consoleLogLevel = this.consoleLogLevel;
	ns.separatorLogLevel = this.separatorLogLevel;
	ns.fileLogLevel = this.fileLogLevel;
	ns.compressedTime = this.compressedTime;
	ns.levelMode = this.levelMode;
	ns.name = options.name;
	ns.alternativeColumnCount = this.alternativeColumnCount;
	if (!options.colors) {
		ns.color = color.bgWhite.black;
	} else {
		var c;
		for (var i = 0; i < options.colors.length; i++) {
			if (i === 0) {
				c = color[options.colors[i]];
			} else {
				c = c[options.colors[i]];
			}
		}
		ns.color = c;
	}
	ns.parent = this;
	return ns;
};

Module.prototype.Namespace = function () {};

Module.prototype.Namespace.prototype.time = function() {
	// return short time
	if (this.compressedTime) {
		this.parent.updateCompressedTime();
	}
	if (!compressedTime[this.compressedTime].short) {
		return '';
	}
	return moment().format(compressedTime[this.compressedTime].short + ' ');
};

Module.prototype.Namespace.prototype.level = function (level) {
	// return log level string
	return levelMode[this.levelMode][level];
};

Module.prototype.Namespace.prototype.separator = Module.prototype.Namespace.prototype.sepa = Module.prototype.Namespace.prototype.se = function (text, sll) {
	// apply separatorLogLevel
	var l = applyOption(logLevel, sll, this.separatorLogLevel);
	
	// log the separator
	if (this.consoleLogLevel >= l) {
		var width = process.stdout.columns || this.alternativeColumnCount;
		var time = this.time();
		if (text) {
			var half = (width-this.level(l-1).length-time.length-this.name.length-text.length)/2;
			if (half < 1) {
				half = 1;
			}
			console.log(
				logLevel[l].color(this.level(l-1)) + ' ' +
				time +
				this.color(this.name) + ' ' +
				logLevel[l].color((new Array(Math.floor(half)).join('-') +
				text +
				new Array(Math.ceil(half)).join('-')))
			);
		} else {
			console.log(
				logLevel[l].color(this.level(l-1)) + ' ' +
				time +
				this.color(this.name) + ' ' +
				logLevel[l].color(new Array(width-this.level(l-1).length-time.length-this.name.length-1).join('-'))
			);
		}
	}
};

Module.prototype.Namespace.prototype.applyLogLevel = function (l, args) {
	if (this.consoleLogLevel > l-1 || (this.logFile && this.fileLogLevel > l-1)) {
		var message = util.format.apply(null, args);
		if (this.consoleLogLevel > l-1) {
			console.log(
				logLevel[l].color(this.level(l-1)) + ' ' +
				this.time() +
				this.color(this.name) + ' ' +
				message
			);
		}
		if (this.fileLogLevel > l-1 && this.parent.logFile) {
			this.parent.logger(l, args, this);
		}
	}
};

// internal

Module.prototype.updateCompressedTime = function() {
	// log compressed time if needed
	var currentTime = moment().startOf(compressedTime[this.compressedTime].startOf);
	if (!this.lastLog || currentTime.isAfter(this.lastLog)) {
		var message;

		this.lastLog = currentTime;

		if (this.compressedTimeAsSeparator) { // time as separator
			var text = compressedTime[this.compressedTime].message + ': ' +
				moment().format(compressedTime[this.compressedTime].long);
			var width = process.stdout.columns || this.alternativeColumnCount;
			var half = (width-this.level(8).length-text.length+1)/2;
			if (half < 1) {
				half = 1;
			}
			message = this.level(8) + ' ' +
				new Array(Math.floor(half)).join('-') +
				text +
				new Array(Math.ceil(half)).join('-');
		} else { // default
			message = levelMode[this.levelMode][8] + ' ' +
				compressedTime[this.compressedTime].message + ': ' +
				moment().format(compressedTime[this.compressedTime].long);
		}

		// log it
		console.log(logLevel.time.color(message));
	}
};

Module.prototype.applyLogLevel = function(l, args) {
	if (this.consoleLogLevel > l-1 || (this.logFile && this.fileLogLevel > l-1)) {
		var message = util.format.apply(null, args);
		if (this.consoleLogLevel > l-1) {
			console.log(
				logLevel[l].color(this.level(l-1)) + ' ' +
				this.time() +
				message
			);
		}
		if (this.fileLogLevel > l-1 && this.logFile) {
			this.logger(l, args);
		}
	}
};

Module.prototype.logger = function (l, args, namespace) {
	if (this.logFile) {
		var dump = [];
		var realArgs = [];
		for (var i = 0; i < args.length; i++) {
			if (typeof args[i] === 'object') {
				dump.push(args[i]);
				if (typeof args[0] === 'string' && args[0].search('%j') !== -1) {
					realArgs.push(args[i]);
				}
			} else {
				realArgs.push(args[i]);
			}
		}

		var time = moment();

		var o = {
			time: {}
		};
		o.time.human = time.format('YYYY-MM-DD HH:mm:ss Z');
		o.time.stamp = time.valueOf();
		o.level = logLevel[l].name;

		if (namespace) {
			o.namespace = namespace.name;
		}
		o.message = util.format.apply(null, realArgs);
		if (dump.length) {
			o.dump = dump;
		}

		var spacer = null;
		if (this.prettyJSON) {
			spacer = '\t';
		}

		this.logFile.write(
			JSON.stringify(o, null, spacer) +
			'\n'
		);
	}
};

Module.prototype.time = function() {
	// return short time
	if (this.compressedTime) {
		this.updateCompressedTime();
	}
	if (!compressedTime[this.compressedTime].short) {
		return '';
	}
	return moment().format(compressedTime[this.compressedTime].short + ' ');
};

Module.prototype.level = function (level) {
	// return log level string
	return levelMode[this.levelMode][level];
};

// create logging functions
var prototypeNames = [
	['emergency', 'emer', 'mrgc', 'em'],
	['alert', 'aler', 'alrt', 'al'],
	['critical', 'crit', 'crtc', 'cr'],
	['error', 'erro', 'rror', 'er'],
	['warning', 'warn', 'wrng', 'wa'],
	['notice', 'noti', 'notc', 'no'],
	['info', 'in'],
	['debug', 'debu', 'dbug', 'de']
];

prototypeNames.forEach(function(names, level) {
	var fn = function() {
		this.applyLogLevel(level + 1, arguments);
	};
	names.forEach(function(n) {
		Module.prototype[n] = Module.prototype.Namespace.prototype[n] = fn;
	});
});

// export module

module.exports = Module;
