const process = require('process');
const Console = require('../modules/log');

/**
 * Инициализация таблиц для Socket.IO
 * @param {*} callback 
 */
exports.init = function(callback) {
    var pool = require('mobnius-pg-dbcontext/modules/pool-connection-db');
    pool.query(`
        CREATE TABLE IF NOT EXISTS socket_io_attachments (
                id          bigserial UNIQUE,
                created_at  timestamptz DEFAULT NOW(),
                payload     bytea
            );
        `, null, (err)=> {
            if(err) {
                Console.error(`Socket IO - table init ${process.pid} error`, 'INIT');
            } else {
                pool.query(`CREATE TABLE IF NOT EXISTS socket_io_messages (
                    id              uuid NOT NULL DEFAULT uuid_generate_v4(),
                    ba_data         bytea NOT NULL,
                    c_data_type     text COLLATE pg_catalog."default" NOT NULL,
                    c_to            text NOT NULL,
                    c_from          text NOT NULL,
                    b_delivered     boolean NOT NULL DEFAULT false,
                    b_temporary     boolean NOT NULL DEFAULT true,
                    dx_created      timestamp without time zone NOT NULL DEFAULT now(),
                    dx_delivered    timestamp without time zone,
                    CONSTRAINT socket_io_messages_pkey PRIMARY KEY (id)
                );
                `, null, (err)=> {
                    if(err) {
                        Console.error(`Socket IO.Messages - table init ${process.pid} error`, 'INIT');
                    } else {
                        callback();
                    }
                });
            }
        });
}