'use strict';

const
	assert   = require('assert'),
	bole     = require('bole'),
	child    = require('child_process'),
	Emitter  = require('events'),
	through2 = require('through2')
	;

function boleStreamToStream(stream)
{
	return through2((buffer, enc, callback) =>
	{
		var json = JSON.parse(buffer.toString()),
			logString = [json.time, json.level.toUpperCase(), json.message, '\n'].join(' ');

		stream.write(logString, 'utf8');
		callback();
	});
}

module.exports = class Rule extends Emitter
{
	constructor(opts)
	{
		super();

		assert(opts, 'you must pass an options object to the constructor');
		assert(opts.event && (typeof opts.event === 'string'), 'rules require an `event` string option');
		assert(opts.pattern && (opts.pattern instanceof RegExp), 'rules require a `pattern` regexp');

		assert(opts.script || opts.func, 'rules require either a `script` or a `func` option');
		if (opts.script)
			assert(typeof opts.script === 'string', 'the `script` option must be a string');
		if (opts.func)
			assert(typeof opts.func === 'function', 'the `func` option must be a function');

		this.sendEvent     = Boolean(opts.sendEvent);
		this.event         = opts.event;
		this.pattern       = opts.pattern;
		this.branchPattern = opts.branchPattern;
		this.script        = opts.script;
		this.func          = opts.func;
		this.cmd           = opts.cmd;
		this.args          = opts.args;
		this.loggers       = opts.loggers;
		this.concurrentOkay = Boolean(opts.concurrentOkay);

		this.cmdbase = (this.cmd ? `${this.cmd} ` : '') + this.script + ' ';
		this.name = `rule:${this.pattern}:${this.event}`;
		this.logger = bole(this.name);

		this.running = false;
		this.bufferedError = '';

		bole.output({
			level: 'error',
			stream: boleStreamToStream(through2((buffer, enc, callback) =>
			{
				this.bufferedError += buffer.toString();
				callback();
			}))
		});
	}

	static reponame(event)
	{
		return event.payload.repository.name;
	}

	static branchname(event)
	{
		return event.payload.ref ? event.payload.ref.replace('refs/heads/', '') : '';
	}

	emitComplete(exitCode, event)
	{
		setImmediate(() =>
		{
			this.emit('complete',
				exitCode || 0,
				this.bufferedError,
				Rule.reponame(event),
				Rule.branchname(event));

			// reset the buffered error output
			this.bufferedError = '';
		});
	}

	test(event)
	{
		if (this.event !== event.event && this.event !== '*')
			return false;

		const repoMatch = (this.pattern.test(Rule.reponame(event)));
		const branchMatch = this.branchPattern ? this.branchPattern.test(Rule.branchname(event)) : true;

		return (repoMatch && branchMatch);
	}

	exec(event)
	{
		if (this.running && !this.concurrentOkay)
		{
			this.logger.info('declining to execute while still in progress');
			return;
		}

		if (this.func)
			this.execFunction(event);
		else
			this.execCommand(event);
	}

	execFunction(event)
	{
		this.logger.debug('calling function');
		this.running = true;
		this.emit('running');

		this.func.apply(this, [event].concat(this.args || []).concat([err =>
		{
			this.running = false;
			if (err)
			{
				this.logger.warn(`problem running function: ${err.message}`);
				this.emit('error', err);
				return;
			}

			this.logger.debug('function complete');
			this.emitComplete(0, event);
		}]));
	}

	execCommand(event)
	{
		this.logger.debug('executing command');
		this.running = true;
		this.emit('running');

		this.logger.info('---------------------------');
		let cmd = this.cmdbase;

		if (this.sendEvent)
		{
			// Add the full event, stringified.
			cmd += JSON.stringify(event);
		}
		else
		{
			const branch = (event.payload.ref ? event.payload.ref.replace(/^refs\/heads\//, '') : '');
			cmd += `${Rule.reponame(event)} ${branch}`;
			if (this.event === 'push' && event.payload.after)
				cmd += ' ' + event.payload.after;
			if (this.args) cmd += ' ' + this.args.join(' ');
		}

		cmd = cmd.trim();
		this.logger.info(`starting execution; cmd=${this.cmdbase}`);
		const ps = child.exec(cmd, { env: process.env });

		ps.on('close', exitCode =>
		{
			this.running = false;
			this.logger.info(`execution complete. Exit code: ${exitCode}`);
			this.logger.info('---------------------------');

			this.emitComplete(exitCode, event);
		});

		ps.stdout.on('data', data =>
		{
			// try to redirect stdout errors to be errors
			if (/error|fail|fatal/i.test(data)) this.logger.error(data);
			else this.logger.debug(data);
		});

		ps.stderr.on('data', chunk =>
		{
			this.logger.error(chunk);
		});
	}
};
