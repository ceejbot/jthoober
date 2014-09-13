var
    assert  = require('assert'),
    bole    = require('bole'),
    hooks   = require('github-webhook-handler'),
    restify = require('restify')
    ;

var Jthoober = module.exports = function Jthoober(options)
{
    assert(options, 'you must pass an options object to the constructor');
    assert(options.mount, 'you must pass a `mount` path in the options');
    assert(options.rules && Array.isArray(options.rules), 'you must pass an array in `rules` in the options');

    this.options = options;
    this.server = restify.createServer(options);
    this.rules = options.rules;
    this.logger = bole('server');

    this.hookHandler = hooks(options);
    this.hookHandler.on('push', this.handlePush.bind(this));

    this.server.post(options.mount, this.handleIncoming.bind(this));
};

Jthoober.prototype.server     = null;
Jthoober.prototype.options    = null;
Jthoober.prototype.rules      = null;
Jthoober.prototype.hookHander = null;
Jthoober.prototype.logger     = null;

Jthoober.prototype.listen = function(port, host, callback)
{
    this.server.listen(port, host, callback);
};

Jthoober.prototype.handleIncoming = function(request, response, next)
{
    var self = this;
    this.hookHandler(request, response, function(err)
    {
        self.logger.warn(err, 'while handling incoming webhook');
    });
    next();
};

Jthoober.prototype.handlePush = function(event)
{
    // TODO insert code here
};
