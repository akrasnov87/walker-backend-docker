/**
 * @file modules/authorize/basic-authorize.js
 * @project ssds-rpc-service
 * @author Александр
 * @todo базовый механизм авторизации. Логин и пароль шифруются как base64 строка
 */

var authorizeDb = require('./authorization-db');
var utils = require('../utils');
var db = require('../dbcontext');
var Console = require('../log');
const NodeCache = require("node-cache");
const args = require('../conf')();
const process = require('process');
const notify = require('../complex-notify');
var pkg = require('../../package.json');

const LOCK_TIME = 5;
const firstCache = new NodeCache({ stdTTL: 60, checkperiod: 30, deleteOnExpire: true });
const disableCache = new NodeCache({ stdTTL: LOCK_TIME * 60, checkperiod: 60, deleteOnExpire: true }); // блокировка пользователей на 5 минут
const AUTH_COUNT = 5; // количество попыток авторизации

/**
 * установка текущего пользователя
 * @param {boolean} skip false - пользователь не авторизован и выдавать сразу код 401
 * @returns {function}
 */
exports.user = function (skip) {
    skip = skip == undefined ? false : skip;
    return function (req, res, next) {
        var data = req.headers[utils.getAuthorizationHeader()] || req.query[utils.getAuthorizationHeader()];
        if (data) {
            var userInfo = [];
            if(data.indexOf('OpenToken ') == 0) {
                if(args.debug) {
                    Console.debug(`OpenToken - авторизация`, 'middleware', null, null);
                }
                var token = data.replace('OpenToken ', '');
                userInfo = token.split(':');
            } else {
                var token = data.replace('Token ', '');
                userInfo = Buffer.from(token, 'base64').toString().split(':');
            }
            var UserName = userInfo[0];
            var Password = userInfo[1];

            var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
            authorizeDb.getUser(UserName, Password, ip, null, req.headers['user-agent'], false, function (user) {

                res.user = user;
                res.isAuthorize = user.id != -1;
                res.isMaster = user.c_claims.indexOf('.master.') >= 0;

                if(res.isMaster && req.headers['x-budibase-authorization']) {
                    db.func('core', 'sf_users_by_login', null).Select({ params: [req.headers['x-budibase-authorization'], false]}, function (data) {
                        var user = data.result.records[0];
                        if(!user) {
                            return res.status(401).json({
                                meta: {
                                    success: false,
                                    host: process.pid
                                }
                            });
                        } else {
                            res.user = user;
                            next();
                        }
                    });

                    return;
                }
                
                if (!res.isAuthorize) {
                    if(args.debug) {
                        Console.debug(`Некорректный заголовок авторизации ${data}`, 'middleware');
                    }

                    if (skip == true) {
                        next();
                    } else { // если пользователь не авторизован, то выдавать сразу код 401
                        res.status(401).json({
                            meta: {
                                success: false,
                                host: process.pid
                            }
                        });
                    }
                } else {
                    next();
                }
            });
        } else {
            if(args.debug) {
                Console.debug(`Заголовок авторизации не передан. status code = ${skip == true ? 200 : 401}`, 'middleware');
            }
            if (skip == true) {
                res.user = Object.assign({
                    id: -1,
                    c_claims: '',
                    c_login: 'none',
                    n_key: null
                });
                res.isAuthorize = false;
                res.isMaster = false;

                next();
            } else {
                res.status(401).json({
                    meta: {
                        success: false,
                        host: process.pid
                    }
                });
            }
        }
    }
}

/**
 * 
 * 
 * @example
 * POST ~/auth
 * 
 * Body x-www-form-urlencoded
 * {
 *      UserName: string - Логин 
 *      Password: string - Пароль
 *      Version: string - версия устройства
 *      Key: string - ключ авторизации
 * }
 * 
 * @todo Статусы;
 * 200 - пользователь авторизован;
 * 401 - пользователь не авторизован;
 * 401 - логин заблокирован из-за частых запросов на авторизацию;
 */
exports.authorize = function (req, res, next) {
    var UserName = req.body.UserName;
    var Password = req.body.Password;
    var Version = req.body.Version;

    var disabled = disableCache.has(UserName) ? disableCache.get(UserName) : null;

    if(disabled) {
        disableCache.set(UserName, {});

        Console.debug(`Пользователь ${UserName} заблокирован на определенный срок.`, 'AUTH');

        return res.status(401).json({
            meta: {
                success: false,
                msg: `Логин ${UserName} заблокирован на ${LOCK_TIME} минут.`,
                host: process.pid
            }
        });
    } else {
        var ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
        authorizeDb.getUser(UserName, Password, ip, Version, req.headers['user-agent'], true, function (user) {

            if (user.id == -1) {

                var result = firstCache.has(UserName) ? firstCache.get(UserName) : {
                    count: 0
                };
                result.count++;
                
                firstCache.set(UserName, result);
            
                if(result.count > AUTH_COUNT) {
                    disableCache.set(UserName, {});
                }

                Console.debug(`Пользователь ${UserName} не авторизован (${result.count}/${AUTH_COUNT}).`, 'AUTH');

                res.status(401).json({
                    meta: {
                        success: false,
                        msg: 'Пользователь не авторизован.',
                        host: process.pid
                    }
                });
            } else {
                Console.debug(`Пользователь ${UserName} выполнил авторизацию.`, 'AUTH', user.id, user.c_claims);

                res.json({
                    token: Buffer.from(UserName + ':' + Password).toString('base64'),
                    user: {
                        id: user.id,
                        login: user.c_login,
                        claims: user.c_claims,
                        date: new Date(),
                        port: process.pid,
                        version: pkg.version,
                        _id: user._id
                    }
                });
            }
        });
    }
}

exports.unlock = function(userName) {
    var disabled = disableCache.has(userName) ? disableCache.get(userName) : null;

    if(disabled) {
        disableCache.del(userName);
    }
}