/*global describe:true, it:true, beforeEach: true, afterEach:true */
/* eslint prefer-arrow-callback:0 */
'use strict';

var
	child    = require('child_process'),
	demand   = require('must'),
	sinon    = require('sinon'),
	Rule     = require('../lib/rule'),
	path     = require('path')
	;

describe('rule', function()
{
	var goodOptions = {
		event: '*',
		pattern: /foo/,
		script: path.join(__dirname, 'script.sh'),
	};

	var pushEvent = {
		event: 'push',
		payload: {
			ref: 'refs/heads/master',
			repository: { name: 'foobie' },
			after: 'deadbeef'
		}
	};

	var otherEvent = {
		event: 'ping',
		payload: {
			repository: { name: 'foobie' }
		}
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

		it('requires a string script option', function(done)
		{
			function shouldThrow() { return new Rule({ event: '*', pattern: /foo/, script: 5 }); }
			shouldThrow.must.throw(/script/);
			done();
		});

		it('requires one of script or func options', function(done)
		{
			function shouldThrow() { return new Rule({ event: '*', pattern: /foo/ }); }
			shouldThrow.must.throw(/script/);
			shouldThrow.must.throw(/func/);
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

			rule.must.have.property('event');
			rule.event.must.equal(goodOptions.event);

			rule.must.have.property('name');
			rule.name.must.equal('rule:/foo/:*');
			done();
		});

		it('accepts a `func` option', function(done)
		{
			function swizzle(event) { event.foo = 'bar'; }
			var rule = new Rule({
				event: '*',
				pattern: /foo/,
				func: swizzle
			});

			rule.must.have.property('func');
			rule.func.must.be.a.function();
			rule.func.must.equal(swizzle);
			done();
		});
	});

	describe('test()', function()
	{

		it('compares the rule event to the incoming event', function(done)
		{
			var rule = new Rule(goodOptions);
			var event = {
				event: 'push',
				payload: { repository: { name: 'foobie' }}
			};

			rule.test(event).must.be.true();
			rule.event = 'issues';
			rule.test(event).must.be.false();

			done();
		});

		it('tests the repo name against the pattern', function(done)
		{
			var rule = new Rule(goodOptions);
			var event = {
				event: 'push',
				payload: { repository: { name: 'foobie' }}
			};

			rule.test(event).must.be.true();
			rule.pattern = /bletch/;
			rule.test(event).must.be.false();

			done();
		});

		it('tests the branch name against the `branchPattern`', function(done)
		{
			goodOptions.branchPattern = /master/;
			var rule = new Rule(goodOptions);
			var event = {
				event: 'push',
				payload: { repository: { name: 'foobie' }, ref: 'refs/heads/master'}
			};

			rule.test(event).must.be.true();
			rule.branchPattern = /bletch/;
			rule.test(event).must.be.false();

			delete goodOptions.branchPattern;
			done();
		});
	});

	describe('exec()', function()
	{
		it('runs the provided script', function(done)
		{
			var spy = sinon.spy(child, 'exec');
			var rule = new Rule(goodOptions);
			var event = {
				event: 'push',
				payload: { repository: { name: 'foobie' }}
			};

			var sawRunning;

			rule.on('running', function() { sawRunning = true; });
			rule.on('complete', function()
			{
				sawRunning.must.be.true();
				spy.called.must.be.true();
				child.exec.restore();

				done();
			});

			rule.exec(event);
		});

		it('runs the provided script with `cmd` when provided', function(done)
		{
			goodOptions.cmd = 'bash';
			var spy = sinon.spy(child, 'exec');
			var rule = new Rule(goodOptions);
			var sawRunning;

			rule.on('running', function() { sawRunning = true; });
			rule.on('complete', function()
			{
				sawRunning.must.be.true();
				spy.called.must.be.true();
				spy.calledWith('bash ' + goodOptions.script + ' foobie master').must.be.true();

				// cleanup
				child.exec.restore();
				delete goodOptions.cmd;
				done();
			});

			rule.exec(pushEvent);
		});

		it('only includes repo for non-push events', function(done)
		{
			goodOptions.cmd = 'bash';
			var spy = sinon.spy(child, 'exec');
			var rule = new Rule(goodOptions);
			var sawRunning;

			rule.on('running', function() { sawRunning = true; });
			rule.on('complete', function()
			{
				sawRunning.must.be.true();
				spy.called.must.be.true();
				spy.calledWith('bash ' + goodOptions.script + ' foobie').must.be.true();

				// cleanup
				child.exec.restore();
				delete goodOptions.cmd;
				done();
			});

			rule.exec(otherEvent);
		});

		it('it parses stdout output for errors', function(done)
		{
			var rule = new Rule(goodOptions);
			var sawRunning;
			sinon.spy(rule.logger, 'error');
			sinon.spy(rule.logger, 'debug');

			rule.on('running', function() { sawRunning = true; });
			rule.on('complete', function()
			{
				sawRunning.must.be.true();
				rule.logger.error.callCount.must.be.above(1);
				rule.logger.debug.called.must.be.true();

				done();
			});

			rule.exec(pushEvent);
		});

		it('emits a complete event with error data', function(done)
		{
			var shouldProduceError = {
				event: '*',
				pattern: /foo/,
				script: '/bin/noexist'
			};

			var rule = new Rule(shouldProduceError);

			rule.on('complete', function(exitCode, errOutput)
			{
				exitCode.must.equal(127);
				demand(errOutput).must.exist();
				done();
			});

			rule.exec(pushEvent);
		});

		it('passes additional args when `args` is set', function(done)
		{
			goodOptions.args = ['hi', 'bye'];
			var rule = new Rule(goodOptions);
			var spy = sinon.spy(child, 'exec');

			rule.on('complete', function()
			{
				var expected = goodOptions.script + ' foobie master hi bye';
				spy.called.must.be.true();
				spy.calledWith(expected).must.be.true();

				// cleanup
				delete goodOptions.args;
				spy.restore();
				done();
			});

			rule.exec(pushEvent);

		});

		it('calls func() instead of the script when provided', function(done)
		{
			var swizzle = function(event, callback) { event.foo = 'bar'; callback(); };
			var spy = sinon.spy(swizzle);
			var rule = new Rule({
				event: '*',
				pattern: /foo/,
				func: spy
			});

			rule.on('complete', function()
			{
				spy.called.must.be.true();
				done();
			});

			rule.exec(pushEvent);
		});

		it('calls func() with `args` when provided', function(done)
		{
			var swizzle = function(event, arg1, arg2, callback) { event.foo = 'bar'; callback(); };
			var spy = sinon.spy(swizzle);
			var args = ['hi', 'bye'];
			var event = '*';
			var rule = new Rule({
				event: event,
				pattern: /foo/,
				func: spy,
				args: args
			});

			rule.on('complete', function()
			{
				spy.called.must.be.true();
				spy.calledWith(pushEvent, args[0], args[1]).must.be.true();
				done();
			});

			rule.exec(pushEvent);
		});

		it('deals with a func() error when the func() errors', function(done)
		{
			var swizzle = function(event, callback) { event.foo = 'bar'; callback(new Error('oops!')); };
			var spy = sinon.spy(swizzle);
			var rule = new Rule({
				event: '*',
				pattern: /foo/,
				func: spy
			});

			var event = { event: 'push', payload: { ref: 'refs/heads/master', repository: { name: 'foobie' }} };

			rule.on('error', function(err)
			{
				spy.called.must.be.true();
				err.must.be.an.instanceOf(Error);
				done();
			});

			rule.exec(event);
		});

		it('declines to run if still running', function(done)
		{
			function swizzle(event, callback) { setTimeout(callback, 500); }
			var rule = new Rule({
				event: '*',
				pattern: /foo/,
				func: sinon.spy(swizzle),
			});
			const logspy = sinon.spy(rule.logger, 'info');

			rule.once('running', () =>
			{
				process.nextTick(function() { rule.exec(pushEvent); });
			});

			rule.on('complete', () =>
			{
				rule.func.calledOnce.must.be.true();
				logspy.calledWith('declining to execute while still in progress').must.be.true();
				done();
			});

			rule.exec(pushEvent);
		});

		it('runs concurrently if allowed', function(done)
		{
			function swizzle(event, callback) { setTimeout(callback, 500); }
			var rule = new Rule({
				event: '*',
				pattern: /foo/,
				func: sinon.spy(swizzle),
				concurrentOkay: true,
			});
			let count = 0;

			rule.once('running', () =>
			{
				process.nextTick(function() { rule.exec(pushEvent); });
			});

			rule.on('complete', () =>
			{
				count++;
				if (count >= 2) done();
			});

			rule.exec(pushEvent);
		});
	});
});
