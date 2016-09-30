#!/usr/bin/env node

var bole     = require('bole');
var jthoober = require('./index');
var path     = require('path');
var argv     = require('yargs')
	.usage('Usage: jthoober --rules path/to/rules.js --secret sooper-sekrit')
	.alias('rules', 'r')
	.describe('rules', 'path to the rules file')
	.demand('rules')
	.describe('secret', 'shared secret with github')
	.demand('secret')
	.alias('p', 'port')
	.describe('p', 'port to listen on')
	.default('p', 5757)
	.alias('h', 'host')
	.describe('h', 'host to bind to')
	.default('h', 'localhost')
	.describe('mount', 'path to mount routes on')
	.default('mount', '/webhook')
	.describe('slack', 'full url of slack webhook for posting results')
	.help('help')
	.argv
;

// resolve ./ to the current working directory executing jthoober.
var rulesModule = argv.rules.match(/^.\//) ? path.resolve(process.cwd(), argv.rules) : argv.rules;
var ruleInput = require(rulesModule);
var rules = [];
ruleInput.forEach(function(data)
{
	rules.push(new jthoober.Rule(data));
});

var opts = {
	name: 'jthoober',
	port: process.env.PORT || argv.port,
	host: process.env.HOST || argv.host,
	rules: rules,
	path: argv.mount,
	secret: argv.secret
};

var logger = bole('wrapper');
var outputs = [];
if (process.env.NODE_ENV === 'dev')
{
	var prettystream = require('bistre')({ time: true });

	prettystream.pipe(process.stdout);
	outputs.push({ level: 'debug', stream: prettystream });
}
else
	outputs.push({ level: 'info', stream: process.stdout });
bole.output(outputs);

if (argv.slack)
{
	jthoober.Slacker.createClient(argv);
}

var server = new jthoober.Server(opts);
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
