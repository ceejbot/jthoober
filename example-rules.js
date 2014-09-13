module.exports =
[
    { pattern: /jthoober/, event: '*', script: '/usr/local/bin/fortune' },
    { pattern: /request/, event: 'push', script: './example-script.sh' },
];
