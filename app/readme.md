# Описание

Сервис для общедоступной версии `Mobile Walker`, которая интегрирована с [budibase](https://github.com/akrasnov87/budibase).

## инициализация приложения

```
nodejs walker-rpc-service conf=/dev.conf
```

По умолчанию используется порт 5000, но можно указать любой свободный.
При указание дополнительного аргумента debug будет сохраняться отладочная информация, но на боевом стенде лучше отключать, чтобы не засорять логи.

```
# {port} - порт, на котором будет работать приложение
port=5000
# {virtual_dir_path} - виртуальный каталог, например /test (обращение будет http://my.domain.ru/test)
virtual_dir_path="/"
# {connection_string} - строка подключения к БД
connection_string="host:server;port:5432;user:root;password:secret;database:database-name"
# {debug} - ставить true если нужна информация для отладки приложения
debug=false 
# {thread} - количество потоков, если передать 0, то равно количеству ядер 
node_thread=-1
# {name} - имя ресурса
name=""
# {application_name} - имя приложения
application_name=""
# {access_buffer_expire} - период времени для хранение ключа безопасности в кэше (секунды)
access_buffer_expire=10
# {access_checkperiod} - период времени для проверки истекших ключей безопасности (секунды)
access_checkperiod=5
# {user_auth_expire} - период времени для хранение ключа авторизации в кэше (секунды)
user_auth_expire=10
# {user_checkperiod} - период времени для проверки истекших ключей авторизации (секунды)
user_checkperiod=5
# {query_limit} - лимит выборки из базы данных для одного запроса
query_limit=10000
# {max_file_size} - максимальный размер данных
max_file_size="100mb"
# {sync_storage} - путь для хранения файлов
sync_storage="./temp"
# {file_dir} - каталог для хранения изображений
file_dir="./files"
# {socket_io_messages_size} - размер сообщения для Socket.IO Messages
socket_io_messages_size=8096
# {primary_role} - первичная роль для определения администратора
primary_role=".master."
# {secodary_role} - вторичная роль для определения администратора
secodary_role=".admin."
# {pg_log} - логировать данные в PostgreSQL
pg_log=true
#{firebase_msg} - использовать механизм отправки уведомлений при помощи firebase
firebase_msg=true
#{budibase_uri} - адрес сайта budibase
budibase_uri="http://localhost:10000/api/global/auth/default/login"
#{budibase_unauthorized_status} - статус неавторизованного пользователя
budibase_unauthorized_status=403
```

## Настройка в VSCode

```
.vscode/launch.json

{
    // Используйте IntelliSense, чтобы узнать о возможных атрибутах.
    // Наведите указатель мыши, чтобы просмотреть описания существующих атрибутов.
    // Для получения дополнительной информации посетите: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "pwa-node",
            "request": "launch",
            "name": "Launch Program",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "program": "${workspaceFolder}${/}bin${/}www",
            "args": ["conf=./dev.conf"]
        }
    ]
}
```

## Авторизация

При установленной настройке `budibase_uri` авторизация будет идти через сервис `budibase` (автоматически будут создаваться УЗ). Если настройка пустая, то авторизация идёт через локальный сервис (прим. проверка производиться только на `логин`).

## База данных

Для корректной работы сервиса должна использоваться база данных из репозитория [github](https://github.com/akrasnov87/walker-db)

## Интеграциия с budibase

В настройках системы требуется передавать два параметра:

* budibase_uri - адрес сайта budibase
* budibase_unauthorized_status - статус неавторизованного пользователя

Пример:
<pre>
#{budibase_uri} - адрес сайта budibase
budibase_uri="http://localhost:10000/api/global/auth/default/login"
#{budibase_unauthorized_status} - статус неавторизованного пользователя
budibase_unauthorized_status=403
</pre>

## Рассылка уведомлений через Firebase

Перейти на сайт https://firebase.google.com/ и создать проект, после чего в корень текущего проекта положить JSON-файл

Пример:
<pre>
{
    "type": "service_account",
    "project_id": "mobilewalker-xxxxxxxx",
    "private_key_id": "cee5cd6e726642d856e5a54feeeeeeeeeeeeee",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCgv7IGDRgiqJPj\nDztBV..........\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-h79wl@mobilewalker-c2c96.iam.gserviceaccount.com",
    "client_id": "1072447813524000000000",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-h79wl%40mobilewalker-c2c96.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com"
  }

</pre>