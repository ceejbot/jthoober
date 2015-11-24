/*global describe:true, it:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand  = require('must'),
	sinon   = require('sinon'),
	slacker = require('../lib/slacker.js');

describe('slacker', function()
{
	var fauxUrl = 'https://slacker.com';

	describe('#createClient', function()
	{
		function makeOptions()
		{
			return { slack: fauxUrl };
		}

		it('creates a client', function()
		{
			slacker.createClient(makeOptions()).must.exist();
		});
	});

	describe('#report', function()
	{
		beforeEach(function()
		{
			slacker.slackClient = { post: sinon.stub() };
			slacker.logger = {
				error: sinon.stub(),
				info: sinon.stub()
			};
		});

		it('does nothing if there is no slack client', function()
		{
			slacker.slackClient = void 0;
			slacker.report('hi').must.be.false();
		});

		it('posts to the slack client', function()
		{
			slacker.report('hi');
			slacker.slackClient.post.calledOnce.must.be.true();
		});

		it('posts options to the slack client', function()
		{
			var message = 'hi';
			var options = { 'icon_url': 'http://icon.jpg.to' };
			slacker.report(message, options);
			slacker.slackClient.post.calledWith('', {
				text: message,
				'icon_url': options.icon_url
			});
		});

		it('recurses on long messages', function(done)
		{
			var longMessage = (new Array(3000)).join('a');
			slacker.slackClient.post.yields(null, null, { statusCode: 200 });

			slacker.report(longMessage);
			slacker.slackClient.post.calledTwice.must.be.true();
			done();
		});

		it('logs an error on client error', function(done)
		{
			slacker.slackClient.post.yields(new Error());
			slacker.report('hi');
			slacker.logger.error.callCount.must.equal(1);
			done();
		});

		it('logs an error on a non-200 response', function(done)
		{
			slacker.slackClient.post.yields(null, null, { statusCode: 401 });
			slacker.report('hi');
			slacker.logger.error.callCount.must.equal(1);
			done();
		});
	});
});
