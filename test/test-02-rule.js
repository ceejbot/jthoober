'use strict';

var
    Lab      = require('lab'),
    lab      = exports.lab = Lab.script(),
    describe = lab.describe,
    it       = lab.it,
    child    = require('child_process'),
    demand   = require('must'),
    fs       = require('fs'),
    os       = require('os'),
    sinon    = require('sinon'),
    Rule     = require('../lib/rule')
    ;

describe('rule', function()
{
    var goodOptions =
    {
        event: '*',
        pattern: /foo/,
        script: '/usr/local/bin/fortune'
    };

    describe('constructor', function()
    {
        it('requires an options object', function(done)
        {
            function shouldThrow() { return new Rule(); }
            shouldThrow.must.throw(/options/);
            done();
        });

        it('requires an event option', function(done)
        {
            function shouldThrow() { return new Rule({}); }
            shouldThrow.must.throw(/event/);
            done();
        });

        it('requires a pattern option', function(done)
        {
            function shouldThrow() { return new Rule({ event: '*' }); }
            shouldThrow.must.throw(/pattern/);
            done();
        });

        it('requires a script option', function(done)
        {
            function shouldThrow() { return new Rule({ event: '*', pattern: /foo/ }); }
            shouldThrow.must.throw(/script/);
            done();
        });

        it('can be constructed', function(done)
        {
            var rule = new Rule(goodOptions);

            rule.must.be.an.object();
            rule.must.have.property('test');
            rule.test.must.be.a.function();
            rule.must.have.property('exec');
            rule.exec.must.be.a.function();
            rule.must.have.property('running');
            rule.running.must.be.false();
            rule.must.have.property('logger');
            rule.logger.must.be.an.function();
            rule.logger.must.have.property('info');
            rule.must.have.property('script');
            rule.script.must.equal(goodOptions.script);
            rule.must.have.property('repo');
            rule.must.have.property('event');
            done()
        });
    });

    describe('test()', function()
    {

        it('test() compares the rule event to the incoming event', function(done)
        {
            var rule = new Rule(goodOptions);
            var event =
            {
                event: 'push',
                payload: { repository: { name: 'foobie' }}
            };

            rule.test(event).must.be.true();
            rule.event = 'issues';
            rule.test(event).must.be.false();

            done();
        });

        it('test() tests the repo name against the pattern', function(done)
        {
            var rule = new Rule(goodOptions);

            var event =
            {
                event: 'push',
                payload: { repository: { name: 'foobie' }}
            };

            rule.test(event).must.be.true();
            rule.pattern = /bletch/;
            rule.test(event).must.be.false();

            done();
        });
    });

    describe('exec()', function()
    {
        it('runs the provided script', function(done)
        {
            var spy = sinon.spy(child, 'exec');
            var rule = new Rule(goodOptions);
            var event =
            {
                event: 'push',
                payload: { repository: { name: 'foobie' }}
            };

            var sawRunning;

            rule.on('running', function() { sawRunning = true; })
            rule.on('complete', function()
            {
                sawRunning.must.be.true();
                spy.called.must.be.true();
                child.exec.restore();

                done();
            });

            rule.exec(event);
        });

        it('logs to a file if a path is provided', function(done)
        {
            goodOptions.logfile = os.tmpdir() + '/test-rule.log';
            var rule = new Rule(goodOptions);
            var event = { event: 'push', payload: { repository: { name: 'foobie' }} };
            rule.on('complete', function()
            {
                fs.readFile(goodOptions.logfile, 'utf8', function(err, data)
                {
                    demand(err).not.exist();
                    data.length.must.be.above(0);
                    // probably should test that we wrote some stuff
                    done();
                });
            });

            rule.exec(event);
        });
    });
});
