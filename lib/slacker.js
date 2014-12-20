'use strict';

var
    bole    = require('bole'),
    restify = require('restify')
    ;

var slackClient;
var logger = bole('slack');

exports.createClient = function createClient(opts)
{
    slackClient = restify.createJSONClient({ url: opts.slack });
    logger.info('Slack client created')
};

exports.report = function report(message, options)
{
    if (!slackClient) return;

    var body = options || {};
    var text = message;

    // because slack has message limits
    if (message.length > 499){
        text = message.substr(0, 499)
        exports.report(message.substr(499))
    }
    body.text = text;

    slackClient.post('', body, function(err, req, res, obj)
    {
        if (err)
            logger.error({error: err, message: message}, 'error posting to webhook');
        else if (res.statusCode === 200)
        {
            logger.info('report posted to Slack');
        }
    });
};
