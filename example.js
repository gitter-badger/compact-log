var Log = require('./index.js');
var log = new Log({
	path: __dirname + '/log',
	levelMode: 'smartNoBrackets',
	clear: true
});

log.emergency('emergency');
log.alert('alert');
log.critical('critical');
log.error('error');
log.warning('warning');
log.separator();
log.notice('notice');
log.info('info');
log.debug('debug');
log.separator('Separators can use text.', 'info');
log.info('It\'s able to use %s formats!', 'stuff');
log.separator('emergency separator', 'emergency');
log.debug('You can even dump objects.', {
	test: true,
	woah: 'affirmative'
});
log.de('You can use');
log.dbug('some shorter');
log.debu('variations to log!');
log.warning('This is a really long line, which will probably overflow the width of this console window.');

var ns = log.createNamespace({
	name: 'test'
});

ns.sepa('Even separators can use short functions.');
ns.info('Namespaces, yay!');
ns.se(false, 'alert');

var time = log.createNamespace({
	name: 'compressed time test',
	colors: ['bgYellowBright', 'black']
});

var n = 0;
setInterval(function () {
	time.debug(n++);
}, 1000);
