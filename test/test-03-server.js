/*global describe:true, it:true, beforeEach: true, afterEach:true, before:true*/
/* eslint prefer-arrow-callback:0 */
'use strict';

var
	crypto   = require('crypto'),
	demand   = require('must'),
	restify  = require('restify'),
	sinon    = require('sinon'),
	Server   = require('../lib/jthoober'),
	Rule     = require('../lib/rule')
	;

function signPayload(key, payload)
{
	return 'sha1=' + crypto.createHmac('sha1', key).update(payload).digest('hex');
}

describe('server', function()
{
	var goodOptions = {
		secret: 'foo',
		path: '/bar',
		rules: [
			new Rule({ event: 'ping', pattern: /.*/, func: sinon.spy() }),
			new Rule({ event: 'push', pattern: /.*/, func: sinon.spy() })
		]
	};
	var testServer, testClient, payload;

	before(function(done)
	{
		payload = require('./push_payload.json');

		testClient = restify.createJsonClient({
			url: 'http://localhost:5757/',
			headers:
			{
				'x-github-event': 'push',
				'x-github-delivery': 'yah',
				'x-hub-signature': signPayload('foo', JSON.stringify(payload))
			}
		});
		testServer = new Server(goodOptions);
		testServer.listen(5757, 'localhost', done);
	});

	describe('constructor', function()
	{
		it('requires an options object', function()
		{
			function shouldThrow() { return new Server(); }
			shouldThrow.must.throw(/options object/);
		});

		it('requires a path option', function()
		{
			function shouldThrow() { return new Server({}); }
			shouldThrow.must.throw(/`path`/);
		});

		it('requires a secret option', function()
		{
			function shouldThrow() { return new Server({ path: 'foo' }); }
			shouldThrow.must.throw(/secret/);
		});

		it('requires a rules array option', function()
		{
			function shouldThrow() { return new Server({ path: 'foo', secret: 'bar' }); }
			shouldThrow.must.throw(/rules/);
		});

		it('can be constructed', function()
		{
			var j = new Server(goodOptions);
			j.must.have.property('rules');
			j.rules.must.be.an.array();
			j.must.have.property('server');
			j.server.constructor.name.must.equal('Server');
			j.must.have.property('hookHandler');
		});
	});

	describe('routes', function()
	{
		it('/ping responds with 200 OK', function(done)
		{
			testClient.get('/ping', function(err, req, resp, body)
			{
				demand(err).not.exist();
				body.must.equal('OK');
				done();
			});
		});

		it('/webhook responds with 200 OK', function(done)
		{
			testClient.post('/bar', payload, function(err, req, resp, body)
			{
				demand(err).not.exist();
				resp.statusCode.must.equal(200);
				body.must.eql({ok: true});

				done();
			});
		});

		it('/webhook calls the hook handler', function(done)
		{
			testClient.post('/bar', payload, function(err, req, resp, body)
			{
				demand(err).not.exist();
				goodOptions.rules[1].func.called.must.be.true();

				done();
			});
		});
	});
});
