var admin = require("firebase-admin");
var db = require('./dbcontext');
var args = require('./conf')();
var Console = require('./log');

// https://readmedium.com/sending-firebase-cloud-messaging-fcm-notifications-in-node-js-with-firebase-admin-6267e8de30f5

/**
 * Инициализация SDK
 * 
 * @param {string} firebaseConfig путь к файлу конфигурации с сайта Firebase 
 * @returns 
 */
exports.init = function(firebaseConfig) {
    if(args.firebase_msg) {
        var serviceAccount = require(firebaseConfig);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else {
        Console.debug('Firebase disabled', 'FIREBASE');
    }
}

/**
 * отправка уведомления через firebase на мобильное устройство
 * 
 * @param {integer} userId идент. пользователя
 * @param {string} title заголовок уведомления
 * @param {string} msg сообщение
 * @param {any} data данные
 * @param {*} callback функция обратного вызова
 */
exports.send = function(userId,  title, msg, data, callback) {

    if(!args.firebase_msg) {
        return callback(new Error('Firebase disabled'));
    }

    db.provider.db().query('select * from dbo.sf_active_firebase_connects($1);', [userId], function(err, row) { 
        if(err) {
            return callback(err);
        }

        var row = row.rows[0];
        if(row) {
            var token = row.c_firebase_token;
            if(token) {

                const message = {
                    notification: {
                        title: title,
                        body: msg,
                    },
                    data: Object.assign({
                        title: title,
                        body: msg
                    }, data || {}),
                    token: token,
                };

                admin.messaging().send(message).then(function(response) {
                    callback(null, response);
                })
                .catch(function(error) {
                    callback(error);
                });
            } else {
                callback(new Error('token not found'));
            }
        } else {
            callback(new Error('user not regeistry'));
        }
    });
}