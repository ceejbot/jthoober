#!/usr/bin/env node

'use strict';

const bole     = require('bole');
const jthoober = require('../index');
const path     = require('path');
const argv     = require('yargs')
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
	.help('help')
	.argv
;

const logger = bole('wrapper');
const outputs = [];
if (/^dev/.test(process.env.NODE_ENV))
{
	const prettystream = require('bistre')({ time: true });

	prettystream.pipe(process.stdout);
	outputs.push({ level: 'debug', stream: prettystream });
}
else
	outputs.push({ level: 'info', stream: process.stdout });
bole.output(outputs);

// resolve ./ to the current working directory executing jthoober.
const rulesModule = argv.rules.match(/^.\//) ? path.resolve(process.cwd(), argv.rules) : argv.rules;
const ruleInput = require(rulesModule);
const rules = [];
ruleInput.forEach(data =>
{
	const r = new jthoober.Rule(data);
	rules.push(r);
	logger.info(`loaded ${r.name}`);
});

const opts = {
	name: 'jthoober',
	port: process.env.PORT || argv.port,
	host: process.env.HOST || argv.host,
	rules: rules,
	path: argv.mount,
	secret: argv.secret
};

const server = new jthoober.Server(opts);
server.listen(opts.port, opts.host, err =>
{
	if (err)
	{
		logger.error(err, 'while starting up on port ' + opts.port);
		process.exit(1);
	}

	logger.info(`jthoober listening on ${server.server.address().address}:${server.server.address().port}`);
});
