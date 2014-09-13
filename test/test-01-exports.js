'use strict';

var
    Lab      = require('lab'),
    lab      = exports.lab = Lab.script(),
    describe = lab.describe,
    it       = lab.it,
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
