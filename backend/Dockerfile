FROM docker.io/library/node:20-alpine

#СОздаем рабочую папку
WORKDIR /app

COPY package*.json ./

RUN npm install
#Перенос всего когда в рабочую папку
COPY . .
#Устанавдиваем зависимость так же устанавливаем пользователя и переключаемся на него
RUN addgroup -S appgroup && adduser -S appuser -G appgroup -u 10001 \
 && chown -R appuser:appgroup /app

USER appuser

#запуск зависимости
CMD ["node", "server.js"]

