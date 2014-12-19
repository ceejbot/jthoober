'use strict';

var
    assert   = require('assert'),
    bole     = require('bole'),
    child    = require('child_process'),
    events   = require('events'),
    fs       = require('fs'),
    mkdirp   = require('mkdirp'),
    path     = require('path'),
    slacker  = require('./slacker'),
    util     = require('util'),
    through2 = require('through2'),
    touch    = require('touch')
    ;

var Rule = module.exports = function Rule(opts)
{
    assert(opts, 'you must pass an options object to the constructor');
    assert(opts.event && (typeof opts.event === 'string'), 'rules require an `event` string option');
    assert(opts.pattern && (opts.pattern instanceof RegExp), 'rules require a `pattern` regexp');

    assert(opts.script || opts.func, 'rules require either a `script` or a `func` option');
    if (opts.script)
        assert(typeof opts.script === 'string', 'the `script` option must be a string');
    if (opts.func)
        assert(typeof opts.func === 'function', 'the `func` option must be a function');
    if (opts.logfile)
        assert(typeof opts.logfile === 'string', 'the `logfile` option must be a string');

    events.EventEmitter.call(this);

    this.event    = opts.event;
    this.pattern  = opts.pattern;
    this.script   = opts.script;
    this.func     = opts.func;
    this.logfile  = opts.logfile;
    this.passargs = !!opts.passargs;
    this.cmd      = opts.cmd;
    this.args     = opts.args;
    this.loggers  = opts.loggers;

    this.logger = bole('rule:' + this.pattern + ':' + this.event);

    if (opts.logfile)
    {
        var self = this;
        // sync is okay here because this is just an init task
        // and the init is expected to be sync
        try
        {
            mkdirp.sync(path.dirname(opts.logfile));
            touch.sync(opts.logfile);
        }
        catch (err)
        {
            self.logger(err, 'cannot create logfile');
            throw err;
        }

        // ensure the stream is created after we ensure the logfile exists
        var logfileStream = fs.createWriteStream(opts.logfile, {flags: 'r+'});

        // add the log file in as a log path
        bole.output([
            {
              level: 'debug',
              stream: through2(function(buffer, enc, callback){
                  var json = JSON.parse(buffer.toString())
                    , logString = [json.time, json.level.toUpperCase(), json.message, '\n'].join(' ')
                  logfileStream.write(logString, 'utf8')
                  // ensure we append only
                  callback()
              })
            }
        ]);
    }

    // if we've had loggers passed in, pass them to bole
    if (opts.loggers){
        bole.output(opts.loggers);
    }
};
util.inherits(Rule, events.EventEmitter);

Rule.prototype.event    = null;
Rule.prototype.repo     = null;
Rule.prototype.script   = null;
Rule.prototype.func     = null;
Rule.prototype.logger   = null;
Rule.prototype.logfile  = null;
Rule.prototype.passargs = false;
Rule.prototype.running  = false;


Rule.prototype.test = function(event)
{
    if (this.event !== event.event && this.event !== '*')
        return false;

    return (this.pattern.test(event.payload.repository.name));
};

Rule.prototype.execFunction = function(event)
{
    var self = this;

    self.logger.info('calling function');
    self.running = true;
    self.emit('running');
    self.func.apply(self, [event].concat(self.args || []).concat([function(err)
    {
        self.running = false;

        if (err)
        {
          self.logger.error(err, 'function error');
          self.emit('error', err);
          return
        }

        self.logger.info('function complete');
        self.emit('complete');
    }]));
};

Rule.prototype.exec = function(event)
{
    if (this.running)
    {
        this.logger.info('declining to execute while still in progress');
        return;
    }

    var self = this;

    if (self.func)
        return self.execFunction(event);

    self.running = true;
    self.emit('running');

    var cmd = self.script;
    // if we have a cmd defined, it's a prefix to the script
    if (self.cmd)
        cmd = self.cmd + ' ' + self.script;

    var branch = (event.payload.ref ? event.payload.ref.replace(/^refs\/heads\//, '') : '');
    if (self.passargs)
        cmd += ' '  + event.payload.repository.name + ' ' + branch;
    if (self.args)
        cmd += ' ' + self.args.join(' ');

    self.logger.info('starting execution; cmd=' + cmd);

    var ps = child.exec(cmd, { env: process.env });

    ps.on('close', function onPsClose(exitCode){
      self.running = false;
      self.logger.info('execution complete. Exit code: ' + exitCode);
      self.logger.info('---------------------------');
      self.emit('complete');
    })

    // slacker will determine if these reports actually get sent.
    ps.stdout.on('data', slacker.report);
    ps.stderr.on('data', slacker.report);

    // if we have a log file, output to that too
    if (!self.logfile) return
    ps.stdout.on('data', self.logger.info);
    ps.stderr.on('data', self.logger.error);
};
