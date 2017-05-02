# jthoober

[![Greenkeeper badge](https://badges.greenkeeper.io/ceejbot/jthoober.svg)](https://greenkeeper.io/)

A service to receive github webhook events & run scripts in response. Run custom testing or deploys in response to pushes. Built on top of rvagg's [github-webhook-handler](https://github.com/rvagg/github-webhook-handler) and mcavage's [restify](http://mcavage.me/node-restify/).

[![on npm](https://img.shields.io/npm/v/jthoober.svg?style=flat)](https://www.npmjs.org/package/jthoober)  [![Tests](https://img.shields.io/travis/ceejbot/jthoober.svg?style=flat)](http://travis-ci.org/ceejbot/jthoober)  [![Coverage](https://img.shields.io/coveralls/ceejbot/jthoober.svg?style=flat)](https://coveralls.io/github/ceejbot/jthoober?branch=master) [![Dependencies](https://img.shields.io/david/ceejbot/jthoober.svg?style=flat)](https://david-dm.org/ceejbot/jthoober)

## Usage

`npm install --save jthoober`

Set up jthoober somewhere that github has access to. Create a shared secret for github to send to the webhook & make a note of it. Run jthoober like this:

```shell
Usage: jthoober --rules path/to/rules.js --secret sooper-sekrit

Options:
  --rules, -r  path to the rules file                         [required]
  --secret     shared secret with github                      [required]
  -p, --port   port to listen on                              [default: 5757]
  -h, --host   host to bind to                                [default: "localhost"]
  --mount      path to mount routes on                        [default: "/webhook"]
  --slack      full url of slack webhook to post results
  --help       Show help
```

I like to use nginx to terminate tls then proxy pass through to jthoober. I run it under upstart.

Set up a webhook for a project on github. Point it to your jthoober location & give it the secret string you created earlier. Observe that the test payload makes it through.

Optionally, set up an incoming webhook for your Slack organization to report results to a specific channel.

### Rules

The rules file must export an array of hashes; each hash is passed to the Rule constructor to make an object. (NOTE: I will make this smarter than that before publishing this.) Set up rules that match repos to scripts to execute when jthoober receives an event. Here are some examples:

```javascript
module.exports =
[
    { pattern:/jthoober/,
      event: '*',
      script: '/usr/local/bin/fortune'
    },
    { pattern: /request/,
      event: 'push',
      script: './example-script.sh',
    },
    { pattern: /reponame/,
      branchPattern: /master/,
      event: 'push',
      script: './example-script.sh'
    },
    {
      pattern: /reponame/,
      event: 'push',
      script: './example-script.js',
      cmd: 'node',
      args: [process.env, '-t 100']
      // will result in `node ./example-script.js <repoName> <branchName> <env> -t 100`
    },
    {
      pattern: /issue/,
      event: 'issues',
      func: function(event, cb) { console.log('hi'); cb(); },
    },
    {
      pattern: /manyissues/,
      event: 'issues',
      args: [process.env, 'cheddar'],
      func: function(event, env, cheese, cb) { console.log('hi'); cb(); }
    },
    {
      pattern: /customLoggers/,
      event: '*',
      // options to pass to bole.output
      loggers: {level: 'debug', stream: myWritableStream},
      func: function(event, cb){
        this.logger.info('hi');
        cb();
      }
    }
];
```

Rules may either invoke a script file or call a javascript function.

A javascript function will be passed the event object & a callback to fire when complete.

All rules receive the repo name as the first script argument & the ref of the commit (aka the branch) as the second. If the event is a *push* event, the third argument is the `after` payload field, aka the hash of the head commit. If you are passing the event to a javascript function instead of invoking an external script, you are given have the whole event to play with.

Valid rules options:

* `pattern`: required; regexp to match against the repo name
* `branchPattern`: regexp to match against the branch name.
* `event`: required; github event to match on; `*` matches all events
* `func`: javascript function to invoke on match; mutually exclusive with `script`
* `script`: external executable to invoke on match
* `cmd`: the executable to run the script with; unused for functions. e.g. `bash`
* `args`: an array of additional args to pass to the script or function. These args come after the repo and branch names, at the end of args passed. If `func` is passed, these args will come after the event name.
* `slack`: an object of slack options to pass to the slack reporter. Only used if `--slack` is passed.

## Endpoints

`/webhook` - route that responds to the webhook. Configurable; pass `--mount /foo` to the runner to mount the handler on `/foo` instead.

`/ping` - responds with `200 "OK"`. Use this to monitor.

## Logging

The server logs events & status in json to stdout. Pipe the output through `bistre --time` to get pretty logs.

## Notes

`j'thoob` is the official pronunciation of `gi-thub`, aka the site this code is hosted on.

## TODO

Pass more stuff from the hook event to the bash script. Commit hash? Why not allow rules to be arbitrary node code? Or just define a handler API? But bash is so handy.

Logging for js functions?

## License

ISC; see the LICENSE file.
