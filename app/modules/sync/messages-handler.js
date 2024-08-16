var notify = require('../complex-notify');
var Console = require('../log');

/**
 * обработчик обмена сообщений
 * @param {any} socket
 * @param {any} io
 */
module.exports = function (socket, io) {
    /**
     * @param {uuid} uid - иден. сообщения
     * @param {Buffer} buf - буфер
     * @param {string} type - тип данных
     * @param {integer} to - кому требуется передать сообщение
     * @param {boolean} temporary - фвляется временным
     */
    return function (uid, buf, type, temporary, to) {
        try {
            notify.pushSocket(io, socket.user, uid, buf, type, temporary, to);
        } catch(e) {
            Console.error(`${e.stack}`, 'PUSH_NOTIFY', socket.user.id, socket.user.c_claims);
        }
    }
}