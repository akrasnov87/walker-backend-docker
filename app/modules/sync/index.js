var authUtil = require('../authorize/util');
var Console = require('../log');
var socketUtils = require('./utilits');
var uploadHandler = require('./upload-handler');
var downloadHandler = require('./download-handler');
var messagesHandler = require('./messages-handler');
var statusMessagesHandler = require('./status-messages-handler');
var synchronizationHandler = require('./synchronization-handler');
var utils = require('../utils');
const process = require('process');
var fs = require('fs');
var join = require('path').join;
const args = require('../conf')();
var util = require('./catalog-util');

/**
 * Инициализация
 * @param {*} io 
 * @param {string} authType тип авторизации
 */
exports.init = function (io, authType) { 

    authType = authType || 'basic';

    io.on('connection', function (socket) {
        socket.on('disconnect', function (reason) {
            if(socket.user) {
                io.emitter.in(socket.user.id).socketsLeave(socket.user.id);
                Console.debug(`${reason}`, 'SOCKET_REASON', socket.user.id, socket.user.c_claims);
            }
        });

        if (socket.handshake.query.token) {
            isAuthorize(socket, authType, function (req, res) {
                if (res.isAuthorize == true) {
                    res.claims = res.user.c_claims.replace(/^./g, '').replace(/.$/g, '').split('.');

                    res.claims.forEach(function (c) {
                        socket.join(c);
                    });

                    socket.user = res.user;
                    Console.debug(`${process.pid}`, 'SOCKET_CONNECT', socket.user.id, socket.user.c_claims);
                    socket.join(socket.user.id);

                    // тут пользователь авторизован и может работать с socket данными
                    socket.on('synchronization', synchronizationHandler(req, res, socket));
                    socket.on('upload', uploadHandler(req, res, socket));
                    socket.on('download', downloadHandler(req, res, socket));
                    // обмен сообщениями
                    socket.on('messages', messagesHandler(socket, io));
                    socket.on('status-messages', statusMessagesHandler(socket, io));

                    socket.on('remove', (tid) => {
                        if(args.sync_auto_remove) {
                            var root = join(__dirname, '../', '../', args.sync_storage);
                            var dir = tid == "00000000-0000-0000-0000-000000000000" ? root : join(root, util.getCatalogName(new Date(), true));
                            var file = join(dir, tid + '.pkg');
                            if (fs.existsSync(file)) {
                                fs.unlinkSync(file);
                            }
                            file = join(dir, tid + '.bkp');
                            if (fs.existsSync(file)) {
                                fs.unlinkSync(file);
                            }
                            Console.debug(`${tid}`, 'Socket.IO', socket.user.id, socket.user.c_claims, null, null, 'remove');
                        }
                    });

                    // информирование системы о том, что пользователь был зарегистрирован и обработчики настроены
                    socketUtils.registry(socket);
                    // отправка сообщений, которые не были ранее доставлены
                    socketUtils.messages(socket, io);
                } else {
                    Console.debug(null, 'SOCKET_CONNECT_UNKNOWN');
                    socketUtils.noAuth(socket);
                }
            });
        } else {
            Console.debug(null, 'SOCKET_NOT_FOUND_TOKEN');
            socketUtils.noAuth(socket);
        }
    });
}

/**
 * проверка авторизации
 * @param {*} socket 
 * @param {*} callback 
 */
function isAuthorize(socket, authType, callback) {
    var authorization = authUtil.getAuthModule(authType);
    var res = {};
    var obj = {};

    obj[utils.getAuthorizationHeader()] = socket.handshake.query.token;

    var req = {
        headers: Object.assign({
            "user-agent": socket.request.headers["user-agent"]
        }, obj),
        ip: socket.request.connection.remoteAddress,
        socketId: socket.id
    };

    authorization.user(true)(req, res, function () {
        callback(req, res);
    });
}