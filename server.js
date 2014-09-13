#!/usr/bin/env node

var bole     = require('bole');
var Jthoober = require('./index');
var argv     = require('yargs')
		.usage('Usage: node server.js --rules path/to/rules.js')
		.alias('rules', 'r')
		.describe('r', 'path to the rules file')
		.demand('r')
		.alias('p', 'port')
		.describe('p', 'port to listen on')
		.default('p', 5757)
		.alias('h', 'host')
		.describe('h', 'host to bind to')
		.default('h', 'localhost')
		.describe('mount', 'path to mount routes on')
		.default('mount', '/webhook')
		.help('this usage output')
		.argv
	;

var opts =
{
    name:  'jthoober',
    port:  process.env.PORT || argv.port,
    host:  process.env.HOST || argv.host,
    rules: require(argv.rules),
	mount: argv.mount
};

var logger = bole('wrapper');
var outputs = [];
if (process.env.NODE_ENV === 'dev')
{
	var prettystream = require('bistre')({time: true});
	prettystream.pipe(process.stdout);
	outputs.push({ level:  'debug', stream: prettystream });
}
else
	outputs.push({level: 'info', stream: process.stdout});
bole.output(outputs);

var server = new Jthoober(opts);
server.listen(opts.port, opts.host, function(err)
{
    if (err)
    {
        logger.error(err, 'while starting up on port ' + opts.port);
        process.exit(1);
    }

	// The next line delights me.
    logger.info('jthoober listening on ' + server.server.address().address + ':' + server.server.address().port);
});
