var handler = require('./handler');
var util = require('./catalog-util');
var socketUtil = require('./utilits');
var join = require('path').join;
var fs = require('fs');
var Console = require('../log');
const args = require('../conf')();

/**
 * обработчик синхронизации для WebSocket
 * @param {any} req - эмулирование request
 * @param {any} res - эмулирование response
 * @param {any} socket
 */
module.exports = function (in_req, in_res, socket) {
    var root = join(__dirname, '../', '../', args.sync_storage);
    return function (tid, version) {

        var req = Object.assign({}, in_req);
        var res = Object.assign({}, in_res);

        req.socket = socket;
        var dir = tid == "00000000-0000-0000-0000-000000000000" ? root : join(root, util.getCatalogName(new Date(), true));
        fs.readFile(join(dir, tid + '.bkp'), function (err, buffer) {
            if (err) {
                Console.error('Ошибка синхронизации. Чтения пакета ' + tid + ' от пользователя ' + res.user.c_login + '. ' + err.stack, 'SYNC', res.user.id, res.user.c_claims);
                socketUtil.error(socket, err, tid);
            } else {
                var dt = Date.now();

                handler(req, res, buffer, version, function (code, bytes) {
                    if (bytes) {
                        fs.writeFile(join(dir, tid + '.pkg'), bytes, function (err) {
                            if (err) {
                                Console.error('Ошибка синхронизации. Выполнение пакета ' + tid + ' от пользователя ' + res.user.c_login + '. ' + err.stack, 'SYNC', res.user.id, res.user.c_claims);
                                socketUtil.error(socket, err, tid);
                            } else {
                                if (code == 200) {
                                    Console.debug(`${tid}`,'SYNC_DURATION', res.user.id, res.user.c_claims, Date.now() - dt, Buffer.byteLength(buffer));
                                    socketUtil.success(socket, Buffer.from([]), tid);
                                } else {
                                    socketUtil.error(socket, bytes, tid);
                                }
                            }
                        });
                    } else {
                        Console.error('Ошибка синхронизации. Выполнение пакета ' + tid + ' от пользователя ' + res.user.c_login + '. ' + 'Массив байтов не создан', 'SYNC', res.user.id, res.user.c_claims);
                        socketUtil.error(socket, new Error('Массив байтов не создан'), tid);
                    }
                });
            }
        });
    }
}