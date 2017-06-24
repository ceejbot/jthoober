const
	assert  = require('assert'),
	bole    = require('bole'),
	hooks   = require('github-webhook-handler'),
	os      = require('os'),
	restify = require('restify')
	;

const weblogger = bole('restify');
const hooklogger = bole('hooks');
const hostname = os.hostname();

module.exports = class Jthoober
{
	constructor(options)
	{
		assert(options, 'you must pass an options object to the constructor');
		assert(options.path, 'you must pass a `path` to mount the route on in the options');
		assert(options.secret, 'you must pass a `secret` option');
		assert(options.rules && Array.isArray(options.rules), 'you must pass an array in `rules` in the options');

		this.options = options;
		this.rules = options.rules;

		// The bits that parse the Github web hooks.
		this.hookHandler = hooks(options);
		this.hookHandler.on('push', this.handleHookPush.bind(this));
		this.hookHandler.on('ping', this.handleHookPing.bind(this));
		this.hookHandler.on('error', this.handleHookError.bind(this));

		// Restify to handle incoming posts.
		this.server = restify.createServer(options);
		this.server.post(options.path, this.handleIncoming.bind(this));
		this.server.get('/ping', (request, response, next) =>
		{
			response.send(200, 'OK');
			next();
		});
	}

	listen(host, port, callback)
	{
		this.server.listen(host, port, callback);
	}

	handleIncoming(request, response, next)
	{
		weblogger.debug('event incoming!');
		this.hookHandler(request, response, err =>
		{
			if (err) weblogger.warn(`error returned by hook handler: ${err.message}`);
		});
		next();
	}

	handleHookPing(event)
	{
		hooklogger.info('> ping < from server');
	}

	handleHookError(err)
	{
		hooklogger.warn(`error from hook handler: ${err.message}`);
	}

	handleHookPush(event)
	{
		// This is the actual work.
		hooklogger.info(`processing ${event.event} in repo ${event.payload.repository.name}`);

		this.rules.forEach(rule =>
		{
			if (!rule.test(event))
				return; // the rule has declined to act

			hooklogger.debug('rule matches; spawning the exec');
			rule.once('complete', (code, output, repo, branch) =>
			{
				if (code)
					hooklogger.warn(output);
				else
					hooklogger.info(`Execution complete: ${repo}:${branch ? branch + ': ' : ''} + ${rule.event}; hostname=${hostname}`);
			});

			rule.exec(event);
		});
	}
};
