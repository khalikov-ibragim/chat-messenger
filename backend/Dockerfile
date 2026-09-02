FROM docker.io/library/node:20-alpine

#СОздаем рабочую папку
WORKDIR /app

#Перенос всего когда в рабочую папку
COPY . . 

#Устанавдиваем зависимость
RUN npm install


#запуск зависимости
CMD [ "npm", "start" ]

