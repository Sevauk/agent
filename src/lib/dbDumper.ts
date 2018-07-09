import { spawn } from 'child_process';
import { resolve } from 'path';
import { promisify } from 'util';
import { createCipheriv, randomBytes, publicEncrypt } from 'crypto';

import logger from './log';
import { Config } from './config';
import { waitForProcessStart } from './waitForProcessStart';
import { createGzip } from 'zlib';

const randomBytesPromise = promisify(randomBytes);

export const startDumper = async (backupKey, config: Config) => {
  logger.debug('Starting dump');
  let args;
  if (config.dbType === 'pg') {
    args = [
      '-U', config.dbUsername, '-h', config.dbHost,
      '--format=c',
    ];
    if (!config.dbPassword) {
      args.push('--no-password');
    }
    args.push(config.dbName);
  } else if (config.dbType === 'mysql') {
    args = [
      '-u', config.dbUsername, '-h', config.dbHost,
      '-C', '--single-transaction',
    ];
    if (config.dbPassword) {
      args.push(`--password=${config.dbPassword}`);
    }
    args.push(config.dbName);
  }
  const iv = await randomBytesPromise(128 / 8);
  const cipher = createCipheriv('aes256', backupKey, iv);
  const dumpProcess = await spawn(
    resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`, 'dump'),
    args,
    {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        PGPASSWORD: config.dbPassword,
        LD_LIBRARY_PATH: resolve(config.dumpProgramsDirectory, `${config.dbType}_dumper`),
      },
    },
  );
  logger.debug('Started dump process');

  dumpProcess.on('close', (code) => {
    logger.debug('Dumper closed', { code });
  });

  await waitForProcessStart(dumpProcess);
  logger.debug('Dump process started');
  const gzip = createGzip();
  dumpProcess.stdout.pipe(gzip);
  gzip.pipe(cipher);
  logger.debug('Piped to cipher');
  return {
    backupStream: cipher,
    iv,
  };
};

export const createBackupKey = async (publicKey) => {
  logger.debug('Creating AES key');
  const key = await randomBytesPromise(256 / 8);
  logger.debug('Encrypting AES key with RSA public key');
  const encryptedKey = publicEncrypt(publicKey, key);
  logger.debug('Generated encrypted AES key');
  return { key, encryptedKey };
};

