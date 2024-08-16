var db = require('./dbcontext');
const args = require('./conf')();
var socketUtil = require('./sync/utilits');
var uuid = require('uuid');
var Console = require('./log');

exports.pushLog = logSend
exports.pushSocket = socketSend

/**
 * Запись лога в локальный файл
 * 
 * @param {string} message - текст сообщения
 * @param {string} category - категория
 * @param {any} user - информация о пользователе: { "id": 1, "c_claims": ".master." }
 * @param {string} level - уровень критичности сообщения: low, middle, high
 */
function logSend(message, category, user, level) {
    user = user || { id: '-1', c_claims: 'anonymous' }

    switch(level) {
        case 'low':
            Console.debug(message, category, user.id, user.c_claims);
            break;

        case 'middle':
            Console.log(message, category, user.id, user.c_claims);
            break;

        case 'high':
            Console.error(message, category, user.id, user.c_claims);
            break;
    }
}

/**
 * Отправка уведомления через socket.io
 * 
 * @param {any} io - объект для отправки socket.io 
 * @param {*} user - информация о пользователе: { "id": 1, "c_claims": ".master." }
 * @param {*} uid - идентификатор сообщения. Если передать null, то будет создан автоматически
 * @param {Buffer} buf - объект Buffer. var buf = Buffer.from(JSON.stringify(obj));
 * @param {string} type - тип данных, application/json
 * @param {boolean} temporary - является временным сообщение, по умолчанию True
 * @param {string} to - идентификатор комнаты, куда передаётся уведомление
 * @param {function} callback - функция обратного вызова. Можно не указывать
 * 
 * @example
 * 
 * socketSend(io, { "id": 1, "c_claims": ".master." }, Buffer.from(JSON.stringify(obj)), 'application/json', true, '2')
 */
function socketSend(io, user, uid, buf, type, temporary, to, callback) {
    uid = uid || uuid.v4();
    user = user || { id: '-1', c_claims: 'anonymous' }

    try {
        var length = Buffer.byteLength(buf);
        // проверяем на максимальный размер данных, который можно передавать по socket
        if(length > args.socket_io_messages_size) {
            io.emitter.to(user.id).emit('status-messages', socketUtil.socketResultLayout({ id: uid, messages: 'BUFFER_MAX_SIZE' }));
            Console.debug(`${user.id} <${length}>`, 'Socket.IO', user.id, user.c_claims, null, null, 'BUFFER_MAX_SIZE'); 

            return;
        }
    } catch(err) {
        io.emitter.to(user.id).emit('status-messages', socketUtil.socketResultLayout({ id: uid, messages: 'ERROR' }));
        Console.error(`${err.stack}`, 'Socket.IO', user.id, user.c_claims);
        return;
    }

    // запишем информацию в БД
    db.provider.db().query(`
    INSERT INTO socket_io_messages(id, ba_data, c_data_type, c_to, c_from, b_temporary)
    VALUES($1, $2, $3, $4, $5, $6);`, [uid, buf, type, to, user.id, temporary || true], (err) => {
        if(err) {
            Console.error(`${err.stack}`, 'Socket.IO', user.id, user.c_claims);
        } else {
            io.emitter.to(to).emit('messages', uid, buf, type, to, temporary, user.id);
            Console.debug(`${user.id} -> ${to}`, 'Socket.IO', user.id, user.c_claims, null, null, 'messages');
        }

        if(typeof callback == 'function')
            callback();
    });
}