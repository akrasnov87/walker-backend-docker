/**
 * @file routes/exists.js
 * @project skr-rpc-service
 * @author Александр
 * @todo проверка доступности сервера
 */

var firebaseUtil = require('../modules/firebaseUtil');
var express = require("express");
var router = express.Router();
var pkg = require('../package.json');
var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
const args = require('../modules/conf')();
var authUtil = require('../modules/authorize/util');
const process = require('process');
var pkg = require('../package.json');
var Console = require('../modules/log');

module.exports = function (auth_type) {
   var authType = authUtil.getAuthModule(auth_type);
   router.use('/mail', authType.user());
   router.use('/firebase', authType.user());

   /**
    * Проверка доступности сервиса
    * 
    * @example
    * 
    * GET ~/exists
    * 
    * Headers
    * Content-Type: application/json
    */
   router.get("/", function(req, res) {
       res.json(result_layout.ok([{
           version: pkg.version,
           ip: req.ip,
           now: new Date(),
           host: process.uid,
           conf: args.conf,
           version_container: args.version_container,
           version: pkg.version,
           'arm_version': global.settings['arm_version']
       }]));
   });

   /**
    * Проверка рассылки push-уведомления
    * 
    * @example
    * 
    * GET ~/exists/firebase?userId=11&message=
    * 
    * Headers
    * rpc-authorization: Token
    * Content-Type: application/json
    */
   router.get("/firebase", function(req, res) {
       var userId = req.query.userId;

       firebaseUtil.send(userId, 'Тестовое уведомление', 'Тестовое сообщение от сервера', null, (err, response) => {
           if(err) {
               Console.error(`${err.stack}`, 'FIREBASE_ADMIN', res.user.id, res.user.c_claims);
               
               res.json(result_layout.error([err.message]));
           } else {
               res.json(result_layout.ok(response));
           }
       });
   });

   return router;
}