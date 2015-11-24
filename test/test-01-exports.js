/*global describe:true, it:true, beforeEach: true, afterEach:true */
'use strict';

var
	demand   = require('must'),
	jthoober = require('../index')
	;

describe('exports', function()
{
	it('exports a rule constructor', function(done)
	{
		jthoober.must.have.property('Rule');
		jthoober.Rule.must.be.a.function();
		done();
	});

	it('exports a server constructor', function(done)
	{
		jthoober.must.have.property('Server');
		jthoober.Server.must.be.a.function();
		done();
	});
});
