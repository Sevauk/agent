"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const axios_1 = require("axios");
const unzip = require("unzip-stream");
const mkdirp = require("mkdirp");
const util_1 = require("util");
const fs_1 = require("./fs");
const log_1 = require("./log");
const mkdirpPromisifed = util_1.promisify(mkdirp);
const needToDownloadDumpProgram = async (type, dumpProgramDirectory) => {
    log_1.default.debug('Getting dump programs MD5', { path: dumpProgramDirectory });
    await mkdirpPromisifed(dumpProgramDirectory);
    const existingMd5 = await fs_1.computeFolderContentMd5(dumpProgramDirectory);
    const remoteMd5Url = {
        mysql: 'https://dl.dbacked.com/mysql_md5',
        pg: 'https://dl.dbacked.com/postgres_md5',
        mongodb: 'https://dl.dbacked.com/mongodb_md5',
    }[type];
    log_1.default.debug('Got dump programs MD5', { md5: existingMd5 });
    log_1.default.debug('Getting remote dump programs MD5');
    const remoteMd5 = await axios_1.default.get(remoteMd5Url);
    log_1.default.debug('Got remote programs MD5', { md5: remoteMd5.data });
    return existingMd5 !== remoteMd5.data;
};
exports.checkDbDumpProgram = async (type, directory) => {
    const dumpProgramDirectory = path_1.resolve(directory, `${type}_dumper`);
    log_1.default.debug('Testing if db dump program exists at', { path: dumpProgramDirectory });
    if (await needToDownloadDumpProgram(type, dumpProgramDirectory)) {
        log_1.default.debug('Downloading dump programs', { path: dumpProgramDirectory });
        const fileUrl = {
            mysql: 'https://dl.dbacked.com/mysql.zip',
            pg: 'https://dl.dbacked.com/postgres.zip',
            mongodb: 'https://dl.dbacked.com/mongodb.zip',
        }[type];
        log_1.default.info('Downloading db dump program at url', { url: fileUrl });
        const response = await axios_1.default.get(fileUrl, {
            responseType: 'stream',
        });
        const unzipper = unzip.Extract({ path: dumpProgramDirectory });
        response.data.pipe(unzipper);
        await fs_1.waitForStreamEnd(unzipper, 'close');
        log_1.default.info('Finished downloading db dumpprogram');
        await fs_1.chmodExec(path_1.resolve(dumpProgramDirectory, 'dump'));
        await fs_1.chmodExec(path_1.resolve(dumpProgramDirectory, 'restore'));
    }
};
//# sourceMappingURL=dbDumpProgram.js.map