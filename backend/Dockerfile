FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

COPY .mvn .mvn
COPY mvnw mvnw
COPY pom.xml pom.xml
RUN ./mvnw -q -DskipTests dependency:go-offline

COPY src src
RUN ./mvnw -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app

COPY --from=build /app/target/*.jar /app/app.jar
COPY render-entrypoint.sh /app/render-entrypoint.sh
RUN chmod +x /app/render-entrypoint.sh

ENV JAVA_OPTS=""
EXPOSE 10000

ENTRYPOINT ["/app/render-entrypoint.sh"]
