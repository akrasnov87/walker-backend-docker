var Console = require('../log');
var db = require('../dbcontext');

/**
 * обработчик обмена статусов сообщения
 * @param {any} socket
 * @param {any} io
 */
module.exports = function (socket, io) {
    /**
     * @param {uuid} uid - иден. сообщения
     * @param {integer} to - кому требуется передать сообщение
     */
    return function (uid, to) {
        // запишем информацию в БД
        db.provider.db().query(`
            UPDATE socket_io_messages
            SET b_delivered = true,
            dx_delivered = now()
            WHERE id = $1;`, [uid], (err) => {
            if(err) {
                Console.error(`${err}`, 'Socket.IO', socket.user.id, socket.user.c_claims, null, null);
            } else {
                io.emitter.to(to).emit('status-messages', uid, socket.user.id);
                Console.debug(`${socket.user.id} -> ${to}`, 'Socket.IO', socket.user.id, socket.user.c_claims, null, null, 'messages');
            }
        });
    }
}