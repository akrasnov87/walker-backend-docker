/**
 * @file routes/home.js
 * @project skr-rpc-service
 * @author Александр
 * @todo Домашняя страница
 */

var express = require("express");
var router = express.Router();
var pkg = require('../package.json');
var moment = require('moment');
const args = require('../modules/conf')();
var Console = require('../modules/log');

var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
var db = require('../modules/dbcontext');
 
module.exports = function () {
    router.get("/", home);

    router.get("/settings/mobile", function(req, res) {
        db.provider.db().query(`
        select  s.* 
        from core.sf_mobile_settings() as s;
        `, null, (err, data) => {
            if(err) {
                Console.error(`${err}`, 'SETTING.MOBILE');
                res.json([]);
            } else {
                res.json(result_layout.ok(data.rows));
            }
        });
    });

    return router;
}
 
/**
 * Домашняя страница
 * 
 * @example
 * GET ~/
 */
function home(req, res) {
   res.render('index', {
       version: pkg.version,
       date: moment(new Date()).format('DD.MM.YYYY HH:mm:ss'),
       title: args.name
   });
}
