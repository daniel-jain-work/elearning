install:
	lerna bootstrap

stop:
	echo "stopping db..."
	docker stop db

trap:
	bash -c "trap 'make stop' INT TERM EXIT; $(MAKE)"

db:
	docker run -d --rm -p 3306:3306 --name cldev -v "$(HOME)/mysql/cldev":/var/lib/mysql -e MYSQL_DATABASE=cldev -e MYSQL_ALLOW_EMPTY_PASSWORD=yes mysql:8.0.16 --character-set-server=utf8mb4 --collation-server=utf8mb4_0900_ai_ci --default_authentication_plugin=mysql_native_password --skip-mysqlx

api: install db
	make trap MAKE="lerna run --scope api watch --stream"

teach: install db
	open "http://localhost:12900"
	make trap MAKE="lerna run --parallel --scope api --scope teaching watch"

ops: install db
	open "http://localhost:12700"
	make trap MAKE="NODE_ENV=development lerna run --parallel --scope api --scope operations watch"

check:
	lerna run typecheck
	yarn lint
	lerna run test

migrate:
	lerna run --scope cl-models migrate
