'use strict';

var
    bole    = require('bole'),
    restify = require('restify')
    ;

exports.logger = bole('slack');

exports.createClient = function createClient(opts)
{
    exports.slackClient = restify.createJSONClient({ url: opts.slack });
    exports.logger.info('Slack client created')
    return exports.slackClient
};

exports.report = function report(message, options)
{
    if (!exports.slackClient) return false;

    var body = options || {};
    var text = message;
    var slackMessageLimit = 2000

    // because slack has message limits
    if (message.length > slackMessageLimit){
        text = message.substr(0, slackMessageLimit)
    }
    body.text = text;

    exports.slackClient.post('', body, function(err, req, res, obj)
    {
        var nextMessage = message.substr(slackMessageLimit);

        if (err){
            exports.logger.error({error: err, message: message}, 'error posting to webhook');
        }
        else if (res.statusCode !== 200){
            exports.logger.error({error: new Error('status code: ' + res.statusCode), message: message}, 'error posting to webhook');
        }
        else
        {

            if (nextMessage) exports.report(nextMessage, options);

            exports.logger.info('report posted to Slack');
        }
    });
};
