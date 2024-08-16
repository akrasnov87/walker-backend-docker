/**
 * @file modules/rpc/index.js
 * @project skr-rpc-service
 * @author Александр
 */

var express = require('express');
var router = express.Router();

var authUtil = require('../authorize/util');
var shellContext = require('../custom-context/shell');
var rpcRouter = require('./router/rpc');
var rpcQuery = require('./modules/rpc-query');
var attachmentContext = require('../../modules/sync/attachment-context');

/**
 * инициализация модуля для работы с RPC
 * @param {string} auth_type тип авторизации. По умолчанию basic
 */
module.exports = function (auth_type) {
    var contexts = [];

    contexts.push(shellContext);
    contexts.push(attachmentContext);

    rpcQuery.registryContext(contexts);


    router.use(rpcRouter(auth_type));

    var authType = authUtil.getAuthModule(auth_type);
    router.post('/auth', authType.authorize);

    return router;
}