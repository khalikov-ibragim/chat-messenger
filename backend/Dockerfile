FROM docker.io/library/node:20-alpine

#СОздаем рабочую папку
WORKDIR /app

#Перенос всего когда в рабочую папку
COPY . . 

#Устанавдиваем зависимость так же устанавливаем пользователя и переключаемся на него
RUN npm install \
    RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 10001

USER appuser

#запуск зависимости
CMD ["node", "server.js"]

