module.exports = {
    require: [
        'ts-node/register',
        'tsconfig-paths/register',
        'test/unit/setup.ts',
    ],
    spec: 'test/unit/**/*.test.ts',
};
