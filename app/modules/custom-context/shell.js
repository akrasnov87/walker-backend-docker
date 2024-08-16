/**
 * @file modules/custom-context/shell.js
 * @project ssds-rpc-service
 * @author Александр
 */

/**
 * объект для формирования ответа
 */
var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
var db = require('../dbcontext');
var Console = require('../log');

/**
 * Объект с набором RPC функций
 */
exports.shell = function (session) {

    return {

        /**
         * Получение серверного времени
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "servertime", data: [{ }], type: "rpc", tid: 0 }]
         */
        servertime: function (data, callback) {
            callback(result_layout.ok([{ date: new Date() }]));
        },

        /**
         * Получение токена от firebase
         * @param {*} data 
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "firebaseToken", data: [{ "token": "", "f_session": "" }], type: "rpc", tid: 0 }]
         */
        firebaseToken: function(data, callback) {
            db.provider.db().query(`
                    select * from dbo.sf_add_firebase_connect($1, $2);
            `, [session.user, data], (err, res) => {
                if(err) {
                    Console.error(`${err.message}`, 'FIREBASE_TOKEN', session.user.id, session.user.c_claims);
                    callback(result_layout.error(err));
                } else {
                    Console.debug(`${data.c_firebase_token}`, 'FIREBASE_TOKEN', session.user.id, session.user.c_claims);

                    callback(result_layout.ok([{"status": "OK"}]));
                }
            });
        },

        /**
         * Добавление информации о непереданных данных
         * 
         * @param {any} data данные для передачи
         * @param {*} callback 
         * 
         * @example
         * [{ action: "shell", method: "syncLostItems", data: [{ ... }], type: "rpc", tid: 0 }]
         */
        syncLostItems: function(data, callback) {

            if(Array.isArray(data)) {
                for(var i = 0; i < data.length; i++) {
                    delete data[i].id;
                    data[i].fn_user = session.user.id;
                }
            } else {
                delete data.id;
                data.fn_user = session.user.id;
            }

            db.table('dbo', 'ad_sync_lost_items', session).Add(data, function (result) {
                if (result.meta.success == true) {
                    callback(result_layout.ok([{status: result.result.records[0].rowCount == 1 }]));
                } else {
                    Console.error(`Добавление информации о непереданных данных ${JSON.stringify(data)}`, 'SYNC_LOST_ITEMS', session.user.id, session.user.c_claims);

                    callback(result_layout.error(new Error(result.meta.msg)));
                }
            });
        }
    }
}