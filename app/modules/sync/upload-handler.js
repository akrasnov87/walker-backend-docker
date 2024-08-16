
var util = require('./catalog-util');
var join = require('path').join;
var packager = require('mobnius-packager');
var fs = require('fs');
var Console = require('../log');
var socketUtil = require('./utilits');
const args = require('../conf')();

/**
 * обработчик синхронизации для WebSocket
 * @param {any} req - эмулирование request
 * @param {any} res - эмулирование response
 * @param {any} socket
 */
module.exports = function (in_req, in_res, socket) {
    var root = join(__dirname, '../', '../', args.sync_storage);

    return function (version, bytes, tid, start, length) {
        var req = Object.assign({}, in_req);
        var res = Object.assign({}, in_res);

        req.socket = socket;

        var result = socketUtil.transfer(tid);
        var dir = tid == "00000000-0000-0000-0000-000000000000" ? root : join(root, util.getCatalogName(new Date(), true));
        util.upload(dir, tid, start, bytes, function (err) {
            if (err) {
                result.data.success = false;
                result.data.msg = err.toString();

                Console.error('UPLOAD_HANDLER Ошибка загрузки байтов в файл. TID=' + tid + '. ' + result.data.msg, 'UPLOAD_HANDLER', res.user.id, res.user.c_claims);

                result.meta.start = start;
                socket.emit('upload', result);
            } else {
                if ((start + bytes.length) >= length) {
                    var file = join(dir, tid + '.bkp');
                    fs.readFile(file, function (err, buffer) {
                        if (err) {
                            result.data.success = false;
                            result.data.msg = err.toString();

                            Console.error('UPLOAD_HANDLER Ошибка чтения файла. TID=' + tid + '. ' + result.data.msg, 'UPLOAD_HANDLER', res.user.id, res.user.c_claims);
                            socket.emit('upload', result);
                        } else {
                            buffer = packager.updateStatus(buffer, 1);
                            fs.writeFile(file, buffer, function (err) {
                                if (err) {
                                    result.data.success = false;
                                    result.data.msg = err.toString();

                                    Console.error('UPLOAD_HANDLER Ошибка обновления статуса файла на 1. TID=' + tid + '. ' + result.data.msg, 'UPLOAD_HANDLER', res.user.id, res.user.c_claims);
                                } else {
                                    result.meta.processed = true;
                                    Console.debug(`${length}`, 'UPLOAD_VALUE', res.user.id, res.user.c_claims, null, length);
                                }
                                socket.emit('upload', result);
                            });
                        }
                    });
                } else {
                    result.meta.start = start + bytes.length;
                    
                    Console.debug(null, 'UPLOAD_SPEED', res.user.id, res.user.c_claims, null, bytes.length);

                    socket.emit('upload', result);
                }
            }
        });
    }
}