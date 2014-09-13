var
    assert  = require('assert'),
    bole    = require('bole'),
    child   = require('child_process'),
    hooks   = require('github-webhook-handler'),
    restify = require('restify')
    ;

var Jthoober = module.exports = function Jthoober(options)
{
    assert(options, 'you must pass an options object to the constructor');
    assert(options.path, 'you must pass a `path` to mount the route on in the options');
    assert(options.secret, 'you must pass a `secret` option');
    assert(options.rules && Array.isArray(options.rules), 'you must pass an array in `rules` in the options');

    this.options = options;
    this.rules = options.rules;
    this.logger = bole('server');

    this.hookHandler = hooks(options);
    this.hookHandler.on('push', this.handlePush.bind(this));

    this.server = restify.createServer(options);
    this.server.use(restify.bodyParser());

    this.server.post(options.path, this.handleIncoming.bind(this));
    this.server.get('/ping', this.handlePing.bind(this));
};

Jthoober.prototype.server      = null;
Jthoober.prototype.options     = null;
Jthoober.prototype.rules       = null;
Jthoober.prototype.hookHandler = null;
Jthoober.prototype.logger      = null;

Jthoober.prototype.listen = function(port, host, callback)
{
    this.server.listen(port, host, callback);
};

Jthoober.prototype.handlePing = function(request, response, next)
{
    response.send(200, { status: 'ok' });
    next();
};

Jthoober.prototype.handleIncoming = function(request, response, next)
{
    var self = this;
    self.logger.info('webhook event incoming');
    this.hookHandler(request, response, function(err)
    {
        self.logger.warn(err, 'while handling incoming webhook');
    });
    next();
};

Jthoober.prototype.handlePush = function(event)
{
    var self = this;
    self.logger.info('handling ' + event.name + ' in repo ' + event.payload.repository.name);
    console.log(event);

    this.rules.forEach(function(rule)
    {
        if (rule.event === event.event || rule.event === '*')
        {
            if (rule.pattern.test(event.payload.repository.name))
            {
                self.logger.debug('match found; spawning the exec');
                rule.exec(event);
            }
        }
    });
};
