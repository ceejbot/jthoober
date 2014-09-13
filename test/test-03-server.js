'use strict';

var
    Lab      = require('lab'),
    lab      = exports.lab = Lab.script(),
    describe = lab.describe,
    it       = lab.it,
    demand   = require('must'),
    Server   = require('../lib/jthoober')
    ;

describe('server', function()
{
    var goodOptions =
    {
        secret: 'foo',
        path: '/bar',
        rules: [],
    };

    describe('constructor', function(done)
    {
        it('has tests for the contructor assertions');

        it('can be constructed', function(done)
        {
            var j = new Server(goodOptions);
            j.must.have.property('rules');
            j.rules.must.be.an.array();
            j.must.have.property('server');
            j.server.constructor.name.must.equal('Server')
            j.must.have.property('hookHandler');

            j.must.have.property('logger');
            j.logger.must.be.a.function();
            j.logger.must.have.property('info')

            done();
        });
    });

    it('has tests for handleIncoming()');
    it('has tests for handlePush()');
    it('has tests for handlePing()');
});
