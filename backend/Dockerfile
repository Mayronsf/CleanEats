# Backend CleanEats — build e execução (Render/Railway)
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/cleaneats-1.0.0.jar app.jar
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -Duser.timezone=America/Recife"
EXPOSE 8080
CMD ["sh", "-c", "java $JAVA_OPTS -Dserver.port=${PORT:-8080} -jar app.jar"]
