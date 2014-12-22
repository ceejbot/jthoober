'use strict';

var
    Lab        = require('lab'),
    lab        = exports.lab = Lab.script(),
    describe   = lab.describe,
    it         = lab.it,
    beforeEach = lab.beforeEach,
    demand     = require('must'),
    sinon      = require('sinon'),
    slacker    = require('../lib/slacker.js')
    ;

describe.only('slacker', function(){
    var fauxUrl = 'https://slacker.com'

    describe('#createClient', function(){
        function makeOptions(){
            return {slack: fauxUrl}
        }

        it('creates a client', function(done){
            slacker.createClient(makeOptions()).must.exist()
            done()
        })
    })

    describe('#report', function(){
        beforeEach(function(done){
            slacker.slackClient = {
                post: sinon.stub()
            }
            slacker.logger = {
                error: sinon.stub(),
                info: sinon.stub()
            }
            done()
        })


        it('does nothing if there is no slack client', function(done){
            slacker.slackClient = void 0
            slacker.report('hi').must.be.false()
            done()
        })

        it('posts to the slack client', function(done){
            slacker.report('hi')
            slacker.slackClient.post.calledOnce.must.be.true()
            done()
        })

        it('posts options to the slack client', function(done){
            var message = 'hi'
            var options = {'icon_url': 'http://icon.jpg.to'}
            slacker.report(message, options)
            slacker.slackClient.post.calledWith('', {
                text: message,
                'icon_url': options.icon_url
            })
            done()
        })

        it('recurses on long messages', function(done){
            var longMessage = (new Array(3000)).join('a')
            slacker.slackClient.post.yields(null, null, {statusCode: 200})

            slacker.report(longMessage)
            slacker.slackClient.post.calledTwice.must.be.true()
            done()
        })

        it('logs an error on client error', function(done){
            slacker.slackClient.post.yields(new Error())
            slacker.report('hi')
            slacker.logger.error.callCount.must.equal(1)
            done()
        })

        it('logs an error on a non-200 response', function(done){
            slacker.slackClient.post.yields(null, null, {statusCode: 401})
            slacker.report('hi')
            slacker.logger.error.callCount.must.equal(1)
            done()
        })
    })
})
