# путь к конфигурационному файлу для изменений
CONFIG_PATH="/app/$CONF.conf"

if [ -n "$NODE_VPATH" ]; then
    sed -i 's+virtual_dir_path="/walker/\w*/"+virtual_dir_path="'"$NODE_VPATH"'"+g' $CONFIG_PATH
else
    sed -i 's+virtual_dir_path="/walker/\w*/"+virtual_dir_path="/walker/'"$CONF"'/"+g' $CONFIG_PATH
fi
sed -i 's+application_name="app-walker-\w*"+application_name="app-walker-'"$CONF"'"+g' $CONFIG_PATH

if [ -n "$FIREBASE_MSG" ]; then  
    sed -i 's+firebase_msg=\w*+firebase_msg='"$FIREBASE_MSG"'+g' $CONFIG_PATH
fi

if [ -n "$BUDIBASE_URI" ]; then
    sed -i 's+budibase_uri=.*+budibase_uri="'"$BUDIBASE_URI"'"+g' $CONFIG_PATH
fi

if [ -n "$CONNECT_STR" ]; then
    sed -i 's+connection_string=.*+connection_string="'"$CONNECT_STR"'"+g' $CONFIG_PATH
fi

if [ -n "$NODE_PORT" ]; then
    sed -i 's+port=[0-9]*+port='$NODE_PORT'+g' $CONFIG_PATH
fi

if [ -n "$NODE_DEBUG" ]; then  
    sed -i 's+debug=\w*+debug='"$NODE_DEBUG"'+g' $CONFIG_PATH
fi

if [ -n "$NODE_THREAD" ]; then  
    sed -i 's+node_thread=[0-9]*+node_thread='$NODE_THREAD'+g' $CONFIG_PATH
fi

echo "/bin/bash /etc/nginx/setup.sh $CONF 5000 $NODE_THREAD"

/bin/bash /etc/nginx/setup.sh $CONF 5000 $NODE_THREAD

cat /etc/nginx/upstream.conf
echo ""
echo ""

cat /etc/nginx/sites-available/default
echo ""
echo ""

cat $CONFIG_PATH
echo ""
echo ""

# запуск конфигурации
/usr/bin/node /app/bin/www "conf=$CONFIG_PATH" "version_container=$VERSION_CONTAINER"