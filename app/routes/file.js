/**
 * @file routes/file.js
 * @project skr-rpc-service
 * @author Александр
 * 
 * @todo операции для работы с файловой системой
 */

var express = require("express");
var router = express.Router();
var db = require('../modules/dbcontext');
var result_layout = require('mobnius-pg-dbcontext/modules/result-layout');
var Console = require('../modules/log');
const args = require('../modules/conf')();

var authUtil = require('../modules/authorize/util');
var util = require('../modules/sync/catalog-util');
var fs = require('fs');
var join = require('path').join;

module.exports = function (auth_type) {
    var authType = authUtil.getAuthModule(auth_type);
    router.use('/fs', authType.user());

    router.get('/attachment/:id', getAttachmentItem);
    return router;
}

/**
 * Получение файла из хранилища по идентификатору
 * @example
 * GET ~/file/attachment/:id?download=true
 * 
 * @todo Исключения;
 * id not found - идентификатор не указан;
 * bad select query - ошибка запроса в БД;
 * file not found - файл не найден;
 */
 function getAttachmentItem(req, res) {
    var id = req.params.id;

    if(id) {
        id = id.toLowerCase();

        db.provider.db().query('select * from dbo.cd_attachments as a where a.id = $1;', [id], function(err, row) {
            if(err) {
                Console.error(`${err.stack}.`, 'READ.FS');

                res.json(result_layout.error(['bad select query']));
            } else {
                if(row && row.rows.length > 0) {
                    var record = row.rows[0];

                    var filePath = join(args.file_dir, util.getCatalogName(record.d_created_date).toString(), id + record.c_extension).toLowerCase();
                    if (req.query.download == true) {
                        res.setHeader('Content-Disposition', `attachment; filename=${encodeURI(record.c_name)}`);
                    }
                    
                    res.setHeader("Content-Type", record.c_mime);
                    if(fs.existsSync(filePath)) {
                        return res.status(200).sendFile(filePath);
                    }
                } 

                res.json(result_layout.error(['file not found']));
            }
        });
    } else {
        Console.error(`Идентифиактор файла не указан`, 'READ.FS');

        res.json(result_layout.error(['id not found']));
    }
}