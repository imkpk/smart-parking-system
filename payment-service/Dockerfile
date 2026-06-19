FROM maven:3.9.9-eclipse-temurin-21 AS build

WORKDIR /app

COPY payment-service/pom.xml .
RUN mvn -B dependency:go-offline

COPY payment-service/src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app

ENV SERVER_PORT=8081
ENV JAVA_TOOL_OPTIONS="-Xmx384m"

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8081

CMD ["java", "-jar", "app.jar"]