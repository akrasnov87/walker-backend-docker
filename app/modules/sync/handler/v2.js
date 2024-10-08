var packager = require('mobnius-packager/index-v2');
var handler = require('../../rpc/modules/rpc-handler');
var Console = require('../../log');
var args = require('../../conf')();
const process = require('process');

/**
 * Тестирование синхронизации. Выполнение происходит только при тестировании механизма синхрнизации на телефоне. Версия протокола v0
 * @param {*} res 
 * @param {*} req 
 * @param {any[]} bytes массив байтов
 * @param {function} callback функция обратного вызова
 */
module.exports = function (req, res, bytes, callback) {
    try {
        var pkgRead = packager.read(bytes);
        pkgRead.readData();
        var meta = pkgRead.meta;
        var toResult = [];
        var fromResult = [];
        if(args.debug) {
            Console.debug('Пакет ' + meta.id + ' принят от пользователя ' + res.user.c_login, 'SYNC_HANDLER', res.user.id, res.user.c_claims);
        }
        if (pkgRead.attachments) {
            req.attachments = pkgRead.attachments;
            var attachmentCount = 0;
            for (var i in req.attachments) {
                attachmentCount++;
            }
            if (attachmentCount > 0 && args.debug) {
                Console.debug('В пакете ' + meta.id + ' принятым от пользователя ' + res.user.c_login + ' содержится ' + attachmentCount + ' вложений.', 'SYNC_HANDLER', res.user.id, res.user.c_claims);
            }
        }

        req.tid = meta.id;
        var dt = Date.now();

        if (pkgRead.data.to) {
            req.body = pkgRead.data.to;
            socketSend('PROCESSING_TO', meta.id);
            handler(req, res, function (results) {
                toResult = results;
                Console.debug(meta.id, 'SYNC_HANDLER_TO', res.user.id, res.user.c_claims, Date.now() - dt, Buffer.byteLength(bytes));
                if (pkgRead.data.from) {
                    socketSend('PROCESSING_FROM', meta.id);
                    req.body = pkgRead.data.from;
                    req.isFrom = true;
                    handler(req, res, function (results) {
                        Console.debug(meta.id, 'SYNC_HANDLER_FROM', res.user.id, res.user.c_claims, Date.now() - dt, Buffer.byteLength(bytes));
                        fromResult = results;
                        createPkg();
                    });
                } else {
                    createPkg();
                }
            });
        } else {
            if (pkgRead.data.from) {
                socketSend('PROCESSING_FROM', meta.id);
                req.body = pkgRead.data.from;
                req.isFrom = true;
                handler(req, res, function (results) {
                    Console.debug(meta.id, 'SYNC_HANDLER_FROM', res.user.id, res.user.c_claims, Date.now() - dt, Buffer.byteLength(bytes));
                    fromResult = results;
                    createPkg();
                });
            }
        }

        function createPkg() {
            var attachments = res.attachments;
            socketSend('PROCESSING_CREATE_PACKAGE', meta.id);
            var pkg = packager.write();
            pkg.meta(meta.transaction, meta.dataInfo, meta.version, meta.id);
            for(var i = 0; i < toResult.length; i++) {
                pkg.blockTo('to' + i, toResult[i]);
            }
            for(var i = 0; i < fromResult.length; i++) {
                pkg.blockFrom('from' + i, fromResult[i]);
            }
            

            if (attachments) {
                for (var i in attachments) {
                    var attachment = attachments[i];
                    if (attachment.buffer) {
                        pkg.attachment(attachment.name, attachment.link, attachment.buffer);
                    }
                }
            }
            Console.debug(meta.id, 'SYNC_HANDLER_PACKAGE', res.user.id, res.user.c_claims, Date.now() - dt, Buffer.byteLength(bytes));
            callback(200, pkg.flush(0, pkgRead.type));
        }

        function socketSend(message, tid) {
            if (req.socket) {
                req.socket.emit('synchronization-status', {
                    meta: {
                        processed: true
                    },
                    data: {
                        success: true,
                        msg: ''
                    },
                    result: message + " TID=" + tid + "; TIME=" + (Date.now() - dt),
                    code: 200,
                    tid: tid,
                    host: process.pid
                });
            }
        }
    } catch (e) {
        var message = "Ошибка чтения пакета." + e.stack;
        Console.error(message, 'SYNC_HANDLER', res.user.id, res.user.c_claims);
        callback(500, Buffer.from(message, 'utf-8'));
    }
}