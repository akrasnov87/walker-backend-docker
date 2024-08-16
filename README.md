## Описание

Контейнер для общедоступной версии `Mobile Walker`, которая интегрирована с [budibase](https://github.com/akrasnov87/budibase).

В корне каталога есть папки:

* app - сервис
* nginx - настройки NGINX

### Сборка

1. Убедиться, что в каталоге `app` есть файл для отправки firebase уведомлений. По умолчанию этот механизм отключён, можно попустить этот пункт если не нужно.

2. Выполнить команду `docker build -t akrasnov87/walker-rpc-service:0.1.0 .`

3. Запуск контейнера: 

```
docker container rm -f walker-rpc-service && \
docker run  --env-file ./.env \
            --name walker-rpc-service \
            --restart unless-stopped \
            -p 5001:5000 \
            -v ./app/files:/app/files:rw \
            akrasnov87/walker-rpc-service:0.1.0
```

Пример .env:
<pre>
CONF=app
NODE_PORT=5000
NODE_VPATH="/walker/dev/"
CONNECT_STR="host:server;port:5432;user:root;password:secret;database:database-name"
NODE_THREAD=2
DEBUG=true
VERSION_CONTAINER=0.1.0
BUDIBASE_URI=http://host.docker.internal:10000/api/global/auth/default/login
</pre>

4. Вызвать адрес `http://localhost:5001/walker/dev/exists`

5. Сохранение контейнера в репозитории `docker push akrasnov87/walker-rpc-service:0.1.0`

### Параметры

* CONF - тип конфигурации
* NODE_VPATH - виртуальный путь, можно не указывать, по умолчанию берётся из `CONF`
* NODE_PORT - порт
* NODE_DEBUG - режим отладки, если нужно передать, как true
* NODE_THREAD - количество потоков
* BUDIBASE_URI - адрес сайта [budibase](https://github.com/akrasnov87/budibase)
* CONNECT_STR - [строка подключения к БД](https://github.com/akrasnov87/walker-db)