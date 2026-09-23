
//ПОДКЛЮЧЕНИЕ К СЕРВЕРУ

const { io} = require('socket.io-client');  //Подключаем клиент socket.io(Это мы поставили в npm) из этого пакета нужна функция io, она создает связь с сервером, const - переменная

const URL = 'http://localhost:4000';
const ROOM = 'general';
// URL = АДРЕСС бэкэнда а ROOM = комната чата

function connectToChat(username) {
    const socket = io(URL, {transports: ['websocket']}); // Создание подключения к серверу, а так же использование чистого WebSocket
    socket.emit('register_user', {username}); //шлем серверу "я вхожу с таким то именем "

    return new Promise((resolve) => { // Обещание, вернем результат не сразу а когда придет овтет от сервера
        socket.on('register_ok', () => {
           socket.emit('join_room', ROOM);
           resolve({socket, status: 'ok'});
        }); // подписываемся  на сервер и ждем пока пришлет событие register_ok

        socket.on('username_taken', () => resolve({socket, status: 'taken'})); // в ответ вернем сам сокет + что именно случилось
    })// вернем обьект, что бы дальще им пользоваться
}

function sendMessage(socket, content) {
    return new Promise((resolve) => {
        socket.on('receive_message',(msg) => { // Подписываемся когда придет сообщение
            if (msg.content === content) resolve(true); // если его текст совпадает с тем что отправили значит правда
        });
        socket.emit('send_message', { username: 'Ivan', room: ROOM, content});
    });
}



// ПОЛУЧАЕМ ОТВЕТ ОТ СЕРВЕРАы

(async () => { //асинхронный блок, что бы можно было ждать обещание
    const first = await connectToChat('Ivan'); //ждем пока сервер ответит и кладем результат в first
    console.log('Первый Ivan:', first.status) // Смотрим что ответил сервер

    const second = await connectToChat('Ivan'); //ждем пока сервер ответит и кладем результат в first
    console.log('Второй Ivan:', second.status) // Смотрим что ответил сервер, должен ответить что занят

    if (second.status !== 'taken') {
        console.log('FAIL: второй Ivan не был отклонен!')
        process.exit(1);
    }
    const delivered = await sendMessage(first.socket, 'привет-тест');
    console.log('сообщение доставлено ', delivered);

    if (!delivered) {
        console.log('FAIL : сообщение не вернулось ! ')
        process.exit(1);
    }
})();


