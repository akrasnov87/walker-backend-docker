
/**
 * объект для формирования ответа
 */
var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
var socketUtils = require('./utilits');
/**
 * провайдер по обработке данных
 */
var dbcontext = require('../dbcontext');
var filter = require('../rpc/modules/access-filter');

var Console = require('../log');
var mime = require('mime-types');

var pth = require('path');
var args = require('../conf')();
var fs = require('fs');
var join = pth.join;
var fx = require('mkdir-recursive');
var util = require('./catalog-util');

/**
 * обработка вложений у точки маршрута
 * @param {any} session сессия
 */
exports.attachments = function (session) {
    var userId = session.user.c_login;
    var socketLog = socketUtils.log(session.request.socket, session.request.tid);

    var self = {
        Select: function (query_param, callback) {
            if(Array.isArray(query_param.params)) {
                query_param.params.unshift(session.user);
            }
            dbcontext.provider.select('dbo', 'of_mui_cd_attachments()', query_param, filter.security(session), null, function (args) {
                var results = [];

                if (args.meta.success) {
                    var items = args.result.records;
                    var progressFile = socketUtils.progressFile(socketLog, items.length);
                    progressFile.init(args.time);

                    function next() {
                        var item = items[0];
                        if (item) {
                            items.shift();
                            
                            results.push(item);
                            next();
                        } else {
                            progressFile.finish('Для пользователя ' + userId + ' было обработано ' + progressFile.getTotalCount() + ' файлов за ' + progressFile.getTime() + ' секунд.');
                            //Console.debug(`Было обработано ${progressFile.getTotalCount()} файлов за ${progressFile.getTime()} секунд.`, 'FILE', session.user.id, session.user.c_claims);
                            callback(result_layout.ok(results));
                        }
                    }
                    next();
                } else {
                    Console.error(`Ошибка при выборке файлов: ${args.meta.msg}`, 'FILE', session.user.id, session.user.c_claims);

                    callback(result_layout.error(new Error(socketLog.error('Ошибка при выборке файлов. ' + args.meta.msg))));
                }
            });
        },
        AddOrUpdate: function (data, callback) {
            var dt = Date.now();
            dbcontext.provider.exists('dbo', 'cd_attachments', 'id', data, null, function (result) {
                Console.debug(null, 'FILE_EXISTS', session.user.id, session.user.c_claims, Date.now() - dt);

                if (result.meta.success) {
                    if (result.result.records[0] == true) {
                        self.Update(data, callback);
                    } else {
                        self.Add(data, callback);
                    }
                } else {
                    callback(result_layout.error(new Error(result.meta.msg)));
                }
            });
        },
        Add: function (data, callback) {
            var items = Array.isArray(data) ? data.slice(0) : [data];
            var reader = socketUtils.fileReader(session);

            //Console.debug(`Добавление вложенного файла ${data.id}`, 'FILE', session.user.id, session.user.c_claims);

            var results = [];

            var dt = Date.now();
            var totalCount = items.length;

            function next() {
                var item = items[0];
                if (item) {
                    items.shift();
                    var file = reader.getFileByKey(item.id);
                    if (file) {
                        //Console.debug(`Чтение файла за ${((Date.now() - dt) / 1000)} секунд.`, 'FILE', session.user.id, session.user.c_claims);

                        item.n_size = file.buffer.byteLength;
                        item.c_extension = pth.extname(item.c_name);
                        item.c_mime = mime.lookup(item.c_extension);
                        item.ba_data = file.buffer;
                        //Console.debug(`Обработка файла за ${((Date.now() - dt) / 1000)} секунд.`, 'FILE', session.user.id, session.user.c_claims);
                        var dirPath = join(args.file_dir, util.getCatalogName(item.d_date).toString());
                        if(args.file_dir && !fs.existsSync(dirPath)) {
                            Console.debug(null, 'CREATE_DIR', session.user.id, session.user.c_claims, Date.now() - dt);
                            fx.mkdirSync(dirPath);
                        }

                        if(args.file_dir && fs.existsSync(dirPath)) {
                            fs.writeFile(join(dirPath, item.id.toLowerCase() + item.c_extension), item.ba_data, (err) => {
                                if(err) {
                                    var msg = "Ошибка сохранения файла " + item.id + `${err.message}`;
                                    Console.error(msg, 'FILE', session.user.id, session.user.c_claims);
                                    return callback(result_layout.error(new Error(msg)));
                                }

                                delete item.ba_data;
                                writeDb(item);
                            });
                        } else {
                            writeDb(item);
                        }

                        function writeDb(item) {
                            dbcontext.provider.insert('dbo', 'cd_attachments', item, function (args) {
                                //Console.debug(`Файл записан в БД за ${((Date.now() - dt) / 1000)} секунд.`, 'FILE', session.user.id, session.user.c_claims);

                                // нужно отправлять только те файлы которые были обработаны.
                                if (!args.meta.success) {
                                    var msg = "Ошибка сохранения записи в БД " + item.c_name + " " + args.meta.msg;
                                    Console.error(msg, 'FILE', session.user.id, session.user.c_claims);
                                    return callback(result_layout.error(new Error(msg)));
                                }
                                delete item.ba_data;

                                results.push(item);
                                next();
                            });
                        }
                    } else {
                        delete item.c_name;
                        
                        dbcontext.provider.insert('dbo', 'cd_attachments', item, (args)=>{
                            if (!args.meta.success) {
                                var msg = "Ошибка сохранения записи в БД " + item.c_name + " " + args.meta.msg;
                                Console.error(msg, 'FILE', session.user.id, session.user.c_claims);
                                return callback(result_layout.error(new Error(msg)));
                            }

                            results.push(item);
                            next();
                        });
                    }
                } else {
                    Console.debug(null, 'FILE_APPEND', session.user.id, session.user.c_claims, Date.now() - dt, totalCount);
                    callback(result_layout.ok(results));
                }
            }

            next();
        },
        Update: function (data, callback) {
            delete data.c_name;
            if(args.debug) {
                Console.debug(`Обновление вложенного файла ${data.id}`, 'FILE', session.user.id, session.user.c_claims);
            }
            
            dbcontext.provider.update('dbo', 'cd_attachments', 'id', data, null, function (results) {
                results.result.records = [];
                callback(results);
            });
        }
    };

    return self;
}