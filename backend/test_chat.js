
//ПОДКЛЮЧЕНИЕ К СЕРВЕРУ

const { io} = require('socket.io-client');  //Подключаем клиент socket.io(Это мы поставили в npm) из этого пакета нужна функция io, она создает связь с сервером, const - переменная

const URL = 'http://localhost:4000';
const ROOM = 'general';
// Уникальный ник на каждый прогон: сервер держит ник в Redis через SET NX,
// и если процесс убит без graceful disconnect, ключ остаётся навсегда —
// следующий прогон с тем же именем получил бы "занято" и упал бы.
const USER = `Ivan-${Date.now()}`;
// URL = АДРЕСС бэкэнда а ROOM = комната чата

const TIMEOUT_MS = 15000; // сколько ждём ответа сервера, прежде чем признать тест упавшим

function connectToChat(username) {
    const socket = io(URL, {transports: ['websocket']}); // Создание подключения к серверу, а так же использование чистого WebSocket

    return new Promise((resolve, reject) => { // Обещание, вернем результат не сразу а когда придет овтет от сервера
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error(`register_user: нет ответа за ${TIMEOUT_MS} мс`));
        }, TIMEOUT_MS);

        socket.on('register_ok', () => { // подписываемся  на сервер и ждем пока пришлет событие register_ok
            clearTimeout(timer);
            socket.emit('join_room', ROOM);
            resolve({socket, status: 'ok'});
        });

        socket.on('username_taken', () => { // в ответ вернем сам сокет + что именно случилось
            clearTimeout(timer);
            resolve({socket, status: 'taken'});
        });

        socket.on('connect_error', (err) => {
            clearTimeout(timer);
            reject(new Error(`не удалось подключиться: ${err.message}`));
        });

        // Подписка идёт ДО отправки, и отправляем только в момент connect —
        // иначе быстрый ответ сервера приходит мимо подписки и промис
        // не резолвится никогда (тест висит, job не завершается).
        socket.on('connect', () => socket.emit('register_user', {username})); // шлем серверу "я вхожу с таким то именем"
    })// вернем обьект, что бы дальше им пользоваться
}

function sendMessage(socket, content) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`send_message: сообщение не вернулось за ${TIMEOUT_MS} мс`)), TIMEOUT_MS);

        socket.on('receive_message',(msg) => { // Подписываемся когда придет сообщение
            if (msg.content === content) { // если его текст совпадает с тем что отправили значит правда
                clearTimeout(timer);
                resolve(true);
            }
        });
        socket.emit('send_message', { username: USER, room: ROOM, content});
    });
}



// ПОЛУЧАЕМ ОТВЕТ ОТ СЕРВЕРАы

(async () => { //асинхронный блок, что бы можно было ждать обещание
    try {
        const first = await connectToChat(USER); //ждем пока сервер ответит и кладем результат в first
        console.log('Первый вход:', first.status) // Смотрим что ответил сервер

        const second = await connectToChat(USER); //ждем пока сервер ответит и кладем результат в first
        console.log('Второй вход (ожидаем taken):', second.status) // Смотрим что ответил сервер, должен ответить что занят

        if (second.status !== 'taken') {
            console.log('FAIL: второй вход с тем же ником не был отклонён!')
            process.exit(1);
        }
        const delivered = await sendMessage(first.socket, 'привет-тест');
        console.log('сообщение доставлено ', delivered);

        if (!delivered) {
            console.log('FAIL : сообщение не вернулось ! ')
            process.exit(1);
        }

        // Закрываем сокеты и выходим с кодом 0: иначе открытые соединения
        // держат event loop, процесс живёт вечно и CI-шаг не завершается.
        first.socket.close();
        second.socket.close();
        console.log('OK: тест чата пройден');
        process.exit(0);
    } catch (err) {
        console.error('FAIL:', err.message);
        process.exit(1);
    }
})();


