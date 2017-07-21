module.exports =
[
    { pattern: /jthoober/, event: '*', script: '/usr/local/bin/fortune' },
    { pattern: /request/, event: 'push', script: './bash-example.sh' },
    { pattern: /mkdirp/, event: 'push', script: './bash-fullevent.sh', sendEvent: true },
];
