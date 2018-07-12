"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const log_1 = require("./log");
exports.waitForProcessStart = (childProcess) => {
    return new Promise((resolve, reject) => {
        let processStderr = '';
        log_1.default.debug('Listening on dump process stderr');
        childProcess.stderr.addListener('data', (data) => { processStderr += data; });
        log_1.default.debug('Listening on dump process close event');
        childProcess.addListener('close', (code) => {
            log_1.default.debug('Child process close event fired', { code, processStderr });
            if (code !== 0) {
                reject(new error_1.DbError(processStderr));
            }
        });
        log_1.default.debug('Listening on dump process readable event');
        const waitForReadable = () => {
            log_1.default.debug('Child process readable event fired');
            if (childProcess.stdout.readableLength) {
                log_1.default.debug('Child process readableLength is > 0', { readableLength: childProcess.stdout.readableLength });
                childProcess.stdout.removeListener('readable', waitForReadable);
                const readed = childProcess.stdout.read();
                childProcess.stdout.unshift(readed);
                resolve();
            }
        };
        childProcess.stdout.addListener('readable', waitForReadable);
    });
};
//# sourceMappingURL=waitForProcessStart.js.map