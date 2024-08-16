
var express = require('express');
var router = express.Router();

var authUtil = require('../../authorize/util');
const args = require('../../conf')();

module.exports = function (auth_type) {
    var authType = authUtil.getAuthModule(auth_type);
    router.use('/', authType.user(false));

    router.get('/', getUsers);

    return router;
}

/**
 * Получение списка подключенных пользователей
 * @param {*} req 
 * @param {*} res 
 * @example
 * GET ~/users
 */
function getUsers(req, res) {
    var utils = require('../../utils');

    var data = { 
        url: req.headers.host,
        token: req.query[utils.getAuthorizationHeader()], 
        vPath: args.virtual_dir_path
    };

    res.render('connect', data)
}